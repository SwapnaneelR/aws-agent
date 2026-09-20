import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class CdkGeneratorOutput:
    output_dir: str
    stack_name: str
    files: list[str]


def _pascal(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", " ", s).title().replace(" ", "")


# ── per-service TypeScript construct snippets ─────────────────────────────────

_IMPORTS: dict[str, str] = {
    "lambda": "import * as lambda from 'aws-cdk-lib/aws-lambda';",
    "dynamodb": "import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';",
    "s3": "import * as s3 from 'aws-cdk-lib/aws-s3';",
    "api-gateway-http": "import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';\nimport { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';",
    "api-gateway-rest": "import * as apigw from 'aws-cdk-lib/aws-apigateway';",
    "sqs": "import * as sqs from 'aws-cdk-lib/aws-sqs';",
    "sns": "import * as sns from 'aws-cdk-lib/aws-sns';\nimport * as sns_subs from 'aws-cdk-lib/aws-sns-subscriptions';",
    "rds-aurora": "import * as rds from 'aws-cdk-lib/aws-rds';\nimport * as ec2 from 'aws-cdk-lib/aws-ec2';",
    "elasticache-redis": "import * as elasticache from 'aws-cdk-lib/aws-elasticache';\nimport * as ec2 from 'aws-cdk-lib/aws-ec2';",
    "cloudfront": "import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';\nimport * as origins from 'aws-cdk-lib/aws-cloudfront-origins';",
    "vpc": "import * as ec2 from 'aws-cdk-lib/aws-ec2';",
    "ecs-fargate": "import * as ecs from 'aws-cdk-lib/aws-ecs';\nimport * as ecspatterns from 'aws-cdk-lib/aws-ecs-patterns';\nimport * as ec2 from 'aws-cdk-lib/aws-ec2';",
}


def _construct_for_service(svc: dict[str, Any], project_id: str, session_id: str) -> str:
    name = svc["name"]
    svc_type = svc.get("type", "").lower()
    var = re.sub(r"[^a-zA-Z0-9]", "_", name)
    config = svc.get("config", {})
    tags = f"""
    cdk.Tags.of({var}).add('project_id', '{project_id}');
    cdk.Tags.of({var}).add('session_id', '{session_id}');
    cdk.Tags.of({var}).add('generated_by', 'four-horsemen');"""

    if svc_type == "lambda":
        runtime = config.get("runtime", "PYTHON_3_12")
        timeout = config.get("timeout_seconds", 30)
        memory = config.get("memory_mb", 256)
        return f"""
    const {var} = new lambda.Function(this, '{_pascal(name)}', {{
      runtime: lambda.Runtime.{runtime},
      handler: 'index.handler',
      code: lambda.Code.fromInline('exports.handler = async () => ({{ statusCode: 200 }})'),
      timeout: cdk.Duration.seconds({timeout}),
      memorySize: {memory},
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    }});{tags}"""

    if svc_type == "dynamodb":
        billing = config.get("billing", "PAY_PER_REQUEST")
        return f"""
    const {var} = new dynamodb.Table(this, '{_pascal(name)}', {{
      partitionKey: {{ name: 'pk', type: dynamodb.AttributeType.STRING }},
      sortKey: {{ name: 'sk', type: dynamodb.AttributeType.STRING }},
      billingMode: dynamodb.BillingMode.{billing},
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
    }});{tags}"""

    if svc_type == "s3":
        return f"""
    const {var} = new s3.Bucket(this, '{_pascal(name)}', {{
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    }});{tags}"""

    if svc_type == "sqs":
        fifo = config.get("fifo", False)
        return f"""
    const {var} = new sqs.Queue(this, '{_pascal(name)}', {{
      fifo: {str(fifo).lower()},
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }});{tags}"""

    if svc_type == "sns":
        return f"""
    const {var} = new sns.Topic(this, '{_pascal(name)}', {{
      fifo: false,
    }});{tags}"""

    if svc_type == "api-gateway-http":
        return f"""
    const {var} = new apigwv2.HttpApi(this, '{_pascal(name)}', {{
      apiName: '{name}',
      corsPreflight: {{
        allowHeaders: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      }},
    }});{tags}
    new cdk.CfnOutput(this, '{_pascal(name)}Url', {{ value: {var}.url ?? '' }});"""

    if svc_type == "api-gateway-rest":
        return f"""
    const {var} = new apigw.RestApi(this, '{_pascal(name)}', {{
      restApiName: '{name}',
      deployOptions: {{ tracingEnabled: true }},
    }});{tags}
    new cdk.CfnOutput(this, '{_pascal(name)}Url', {{ value: {var}.url }});"""

    if svc_type == "vpc":
        return f"""
    const {var} = new ec2.Vpc(this, '{_pascal(name)}', {{
      maxAzs: 2,
      natGateways: 1,
    }});{tags}"""

    if svc_type == "ecs-fargate":
        return f"""
    const {var}Cluster = new ecs.Cluster(this, '{_pascal(name)}Cluster', {{ vpc }});
    const {var} = new ecspatterns.ApplicationLoadBalancedFargateService(this, '{_pascal(name)}', {{
      cluster: {var}Cluster,
      cpu: {config.get("cpu", 256)},
      memoryLimitMiB: {config.get("memory_mb", 512)},
      desiredCount: {config.get("desired_count", 1)},
      taskImageOptions: {{
        image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      }},
      publicLoadBalancer: true,
    }});{tags}"""

    # fallback — emit a comment for unknown types
    return f"\n    // TODO: construct for service '{name}' (type: {svc_type})\n"


def _connection_grant(conn: dict, services: list[dict]) -> str:
    src_name = conn["from"]
    dst_name = conn["to"]
    conn_type = conn.get("type", "")
    src_var = re.sub(r"[^a-zA-Z0-9]", "_", src_name)
    dst_var = re.sub(r"[^a-zA-Z0-9]", "_", dst_name)

    src_svc = next((s for s in services if s["name"] == src_name), None)
    dst_svc = next((s for s in services if s["name"] == dst_name), None)

    if not src_svc or not dst_svc:
        return ""

    src_type = src_svc.get("type", "").lower()
    dst_type = dst_svc.get("type", "").lower()

    # lambda → dynamodb
    if src_type == "lambda" and dst_type == "dynamodb":
        if "write" in conn_type and "read" in conn_type:
            return f"\n    {dst_var}.grantReadWriteData({src_var});"
        if "write" in conn_type:
            return f"\n    {dst_var}.grantWriteData({src_var});"
        return f"\n    {dst_var}.grantReadData({src_var});"

    # lambda → s3
    if src_type == "lambda" and dst_type == "s3":
        if "write" in conn_type and "read" in conn_type:
            return f"\n    {dst_var}.grantReadWrite({src_var});"
        if "write" in conn_type:
            return f"\n    {dst_var}.grantPut({src_var});"
        return f"\n    {dst_var}.grantRead({src_var});"

    # api-gateway → lambda (add route)
    if src_type in ("api-gateway-http",) and dst_type == "lambda":
        return f"""
    {src_var}.addRoutes({{
      path: '/{dst_name}',
      methods: [apigwv2.HttpMethod.ANY],
      integration: new HttpLambdaIntegration('{_pascal(dst_name)}Integration', {dst_var}),
    }});"""

    # sqs → lambda (event source)
    if src_type == "sqs" and dst_type == "lambda":
        return f"""
    {dst_var}.addEventSourceMapping('{_pascal(src_name)}Source', {{
      eventSourceArn: {src_var}.queueArn,
      batchSize: 10,
    }});
    {src_var}.grantConsumeMessages({dst_var});"""

    # sns → sqs
    if src_type == "sns" and dst_type == "sqs":
        return f"\n    {src_var}.addSubscription(new sns_subs.SqsSubscription({dst_var}));"

    return f"\n    // TODO: wire {src_name} → {dst_name} ({conn_type})\n"


# ── file writers ──────────────────────────────────────────────────────────────

def _write(path: str, content: str) -> str:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    return path


def generate_cdk_app(
    arch_spec: dict[str, Any],
    project_id: str,
    session_id: str,
    project_slug: str = "App",
) -> CdkGeneratorOutput:
    output_dir = os.path.join(tempfile.gettempdir(), f"cdk-{session_id[:8]}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    stack_name = f"FH{_pascal(project_slug)}AppStack"
    services: list[dict] = arch_spec.get("services", [])
    connections: list[dict] = arch_spec.get("connections", [])

    files = [
        _write(os.path.join(output_dir, "cdk.json"), _cdk_json(stack_name)),
        _write(os.path.join(output_dir, "package.json"), _package_json(project_slug)),
        _write(os.path.join(output_dir, "tsconfig.json"), _tsconfig()),
        _write(os.path.join(output_dir, "bin", "app.ts"), _app_ts(stack_name, project_slug)),
        _write(
            os.path.join(output_dir, "lib", f"{project_slug.lower()}-stack.ts"),
            _stack_ts(stack_name, services, connections, project_id, session_id),
        ),
    ]

    return CdkGeneratorOutput(output_dir=output_dir, stack_name=stack_name, files=files)


def _cdk_json(stack_name: str) -> str:
    return f'{{\n  "app": "npx ts-node --prefer-ts-exts bin/app.ts",\n  "context": {{\n    "@aws-cdk/core:enablePartitionLiterals": true\n  }}\n}}\n'


def _package_json(project_slug: str) -> str:
    return f"""{{\n  "name": "{project_slug.lower()}-cdk",\n  "version": "0.1.0",\n  "scripts": {{\n    "build": "tsc",\n    "synth": "cdk synth",\n    "deploy": "cdk deploy --require-approval never"\n  }},\n  "dependencies": {{\n    "aws-cdk-lib": "2.x",\n    "constructs": "^10.0.0"\n  }},\n  "devDependencies": {{\n    "@types/node": "20.x",\n    "aws-cdk": "2.x",\n    "ts-node": "^10.9.0",\n    "typescript": "~5.4.0"\n  }}\n}}\n"""


def _tsconfig() -> str:
    return """{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "outDir": "./dist",
    "rootDir": "./",
    "esModuleInterop": true
  },
  "exclude": ["node_modules", "dist"]
}
"""


def _app_ts(stack_name: str, project_slug: str) -> str:
    return f"""import * as cdk from 'aws-cdk-lib';
import {{ {stack_name} }} from '../lib/{project_slug.lower()}-stack';

const app = new cdk.App();
new {stack_name}(app, '{stack_name}', {{
  env: {{
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }},
}});
app.synth();
"""


def _stack_ts(
    stack_name: str,
    services: list[dict],
    connections: list[dict],
    project_id: str,
    session_id: str,
) -> str:
    # Collect unique imports
    service_types = {s.get("type", "").lower() for s in services}
    imports_set: set[str] = {"import * as cdk from 'aws-cdk-lib';"}
    if any(s.get("type") == "lambda" for s in services):
        imports_set.add("import * as logs from 'aws-cdk-lib/aws-logs';")
    for svc_type in service_types:
        if svc_type in _IMPORTS:
            imports_set.add(_IMPORTS[svc_type])

    imports_block = "\n".join(sorted(imports_set))

    constructs_block = "".join(
        _construct_for_service(svc, project_id, session_id) for svc in services
    )

    grants_block = "".join(_connection_grant(conn, services) for conn in connections)

    return f"""{imports_block}
import {{ Construct }} from 'constructs';

export class {stack_name} extends cdk.Stack {{
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {{
    super(scope, id, props);
{constructs_block}
{grants_block}
  }}
}}
"""
