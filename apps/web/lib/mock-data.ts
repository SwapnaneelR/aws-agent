import { ArchVersion, Message, Project, Session } from "./types";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj_bitcoin_defi_01",
    org_id: "org_default_horsemen",
    name: "Sovereign Settlement Engine",
    description: "High-throughput cryptographic settlement layer on AWS ECS Fargate + Aurora Serverless v2",
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: "proj_event_streaming_02",
    org_id: "org_default_horsemen",
    name: "Mempool Ingestion Pipeline",
    description: "Real-time Bitcoin block & mempool telemetry aggregator with MSK Kafka & Timestream",
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
];

export const MOCK_SESSIONS: Record<string, Session[]> = {
  proj_bitcoin_defi_01: [
    {
      id: "sess_settlement_v2",
      project_id: "proj_bitcoin_defi_01",
      user_id: "usr_satoshi",
      status: "idle",
      model_used: "us.anthropic.claude-sonnet-4-5-20251001-v2:0",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ],
  proj_event_streaming_02: [
    {
      id: "sess_mempool_v1",
      project_id: "proj_event_streaming_02",
      user_id: "usr_satoshi",
      status: "idle",
      model_used: "us.anthropic.claude-opus-4-8-20251101-v1:0",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ],
};

export const MOCK_MESSAGES: Record<string, Message[]> = {
  sess_settlement_v2: [
    {
      id: "msg_001",
      session_id: "sess_settlement_v2",
      role: "user",
      content: "Design a fault-tolerant AWS backend for our digital gold settlement engine. It needs high availability across 3 AZs, an Application Load Balancer, an auto-scaling ECS Fargate service, Aurora Serverless Postgres for ledger balances, and an S3 bucket with KMS encryption for immutable audit logs.",
      created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    {
      id: "msg_002",
      session_id: "sess_settlement_v2",
      role: "assistant",
      content: `I've analyzed your settlement requirements and synthesized a bank-grade AWS architecture spanning 3 Availability Zones with strict cryptographic boundaries.

### Architectural Highlights
- **VPC Network**: Multi-AZ VPC (3 Public subnets with NAT Gateways, 3 Private Application subnets, 3 Isolated Database subnets).
- **Compute Layer**: ECS Fargate cluster with Auto-scaling (target tracking on CPU & Memory) fronted by an Application Load Balancer with TLS termination.
- **Data Persistence**: Aurora Serverless v2 PostgreSQL cluster configured for automated multi-AZ failover and point-in-time recovery.
- **Audit & Compliance**: S3 Ledger Vault with Object Lock enabled, KMS customer-managed keys (CMK), and S3 Access Points.
- **Security Posture**: AWS WAF web ACL rules for rate-limiting, and AWS Secrets Manager for database credentials rotation.

I have executed the \`design_architecture\` and \`generate_cdk_code\` tools. The updated architecture diagram and CDK construct are ready in the inspector.`,
      created_at: new Date(Date.now() - 3600000 * 1.4).toISOString(),
      toolCalls: ["design_architecture", "generate_cdk_code", "run_security_scan"],
    },
  ],
};

export const MOCK_ARCH_VERSIONS: Record<string, ArchVersion[]> = {
  sess_settlement_v2: [
    {
      id: "arch_v1",
      session_id: "sess_settlement_v2",
      version_num: 1,
      mermaid_diagram: `graph TD
    Client["Client / Trader Apps\\nAPI & Webhook"]
    ALB["Application Load Balancer\\nPUBLIC SUBNETS (3 AZs)"]
    WAF["AWS WAF\\nRATE LIMIT & SHIELD"]
    ECS["ECS Fargate Settlement Service\\nPRIVATE SUBNETS"]
    Aurora["Aurora Serverless v2 PostgreSQL\\nISOLATED DB SUBNETS"]
    S3Audit["S3 Immutable Audit Bucket\\nKMS ENCRYPTED + OBJECT LOCK"]
    KMS["AWS KMS Vault\\nCUSTOMER MANAGED KEY"]

    Client -->|HTTPS / 443| WAF
    WAF --> ALB
    ALB -->|Forward Target Group| ECS
    ECS -->|SQL Connection Pool| Aurora
    ECS -->|Signed Audit Hashes| S3Audit
    KMS -.->|Encrypts| Aurora
    KMS -.->|Encrypts| S3Audit`,
      arch_spec_json: {
        description: "Baseline multi-AZ settlement architecture with Fargate and Aurora Serverless v2",
        services: [
          { name: "alb-ingress", type: "elasticloadbalancing", description: "Internet-facing Application Load Balancer with TLS 1.3" },
          { name: "fargate-engine", type: "ecs", description: "Containerized settlement workers with 2-10 tasks auto-scaling" },
          { name: "aurora-ledger", type: "rds", description: "PostgreSQL 16 compatible Aurora Serverless v2 (0.5 to 16 ACUs)" },
          { name: "s3-audit-vault", type: "s3", description: "WORM compliant storage with Object Lock and SSE-KMS" },
          { name: "kms-master-key", type: "kms", description: "Customer Managed Key with annual key rotation" },
        ],
        connections: [
          { from: "alb-ingress", to: "fargate-engine", type: "HTTP/8000" },
          { from: "fargate-engine", to: "aurora-ledger", type: "TCP/5432" },
          { from: "fargate-engine", to: "s3-audit-vault", type: "HTTPS/443" },
        ],
        estimated_cost_tier: "$180 - $350 / month",
        cdk_code: `import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface SettlementStackProps extends cdk.StackProps {
  projectId: string;
  sessionId: string;
}

export class FHSettlementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SettlementStackProps) {
    super(scope, id, props);

    // 1. Multi-AZ VPC
    const vpc = new ec2.Vpc(this, 'SettlementVpc', {
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Application', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
        { name: 'IsolatedDb', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    // 2. KMS Key for Ledger Encryption
    const ledgerKey = new kms.Key(this, 'LedgerMasterKey', {
      enableKeyRotation: true,
      description: 'Customer Managed Key for Sovereign Settlement Ledger',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3. S3 Audit Vault with Object Lock
    const auditBucket = new s3.Bucket(this, 'AuditVaultBucket', {
      encryptionKey: ledgerKey,
      encryption: s3.BucketEncryption.KMS,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4. Aurora Serverless v2 Cluster
    const dbCluster = new rds.DatabaseCluster(this, 'AuroraLedger', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_1,
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 16,
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      readers: [rds.ClusterInstance.serverlessV2('Reader', { scaleWithWriter: true })],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      storageEncrypted: true,
      storageEncryptionKey: ledgerKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 5. ECS Fargate Cluster & Service
    const cluster = new ecs.Cluster(this, 'SettlementCluster', { vpc });

    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'SettlementService', {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 2,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/amazonlinux/amazonlinux:latest'),
        environment: {
          PROJECT_ID: props.projectId,
          SESSION_ID: props.sessionId,
          DB_HOST: dbCluster.clusterEndpoint.hostname,
          AUDIT_BUCKET: auditBucket.bucketName,
        },
      },
      publicLoadBalancer: true,
    });

    // Security Permissions
    dbCluster.connections.allowDefaultPortFrom(fargateService.service.connections);
    auditBucket.grantReadWrite(fargateService.taskDefinition.taskRole);
    ledgerKey.grantEncryptDecrypt(fargateService.taskDefinition.taskRole);

    cdk.Tags.of(this).add('project_id', props.projectId);
    cdk.Tags.of(this).add('session_id', props.sessionId);
    cdk.Tags.of(this).add('generated_by', 'four-horsemen');
  }
}`,
      },
      created_at: new Date(Date.now() - 3600000 * 1.4).toISOString(),
    },
  ],
};

