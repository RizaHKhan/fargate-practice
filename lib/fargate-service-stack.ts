import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CodeBuildAction,
  EcsDeployAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import {
  Cluster,
  ContainerImage,
  FargateTaskDefinition,
} from "aws-cdk-lib/aws-ecs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import {
  CompositePrincipal,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface FargateServiceStackProps extends StackProps {
  vpc: Vpc;
  secret: Secret;
}

export class FargateServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: FargateServiceStackProps) {
    super(scope, id, props);

    const repository = new Repository(this, "FargateRepository", {
      repositoryName: "fargate-repository",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const sourceArtifact = new Artifact("SourceArtifact");
    const buildArtifact = new Artifact("BuildArtifact");

    const pipeline = new Pipeline(this, "FargatePipeline", {
      pipelineName: "FargatePipeline",
      role: new Role(this, "FargatePipelineRole", {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal("codebuild.amazonaws.com"),
          new ServicePrincipal("codepipeline.amazonaws.com"),
        ),
        inlinePolicies: {
          deployToFargateService: new PolicyDocument({
            statements: [
              new PolicyStatement({
                actions: [
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetBucketVersioning",
                ],
                resources: ["*"],
              }),
            ],
          }),
        },
      }),
      artifactBucket: new Bucket(this, "ArtifactBucket", {
        removalPolicy: RemovalPolicy.DESTROY,
      }),
    });

    pipeline.addStage({
      stageName: "Source",
      actions: [
        new GitHubSourceAction({
          actionName: "Source",
          owner: "RizaHKhan",
          repo: "assessment-jsi",
          branch: "master",
          oauthToken: props.secret.secretValue,
          output: sourceArtifact,
        }),
      ],
    });

    pipeline.addStage({
      stageName: "Deploy",
      actions: [
        new CodeBuildAction({
          actionName: "BuildAndPushToECR",
          project: new PipelineProject(this, "PipelineProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
              privileged: true,
            },
            environmentVariables: {
              REPOSITORY_URI: { value: repository.repositoryUri },
            },
            buildSpec: BuildSpec.fromObject({
              version: "0.2",
              phases: {
                pre_build: {
                  commands: [
                    "echo Logging in to Amazon ECR...",
                    "aws --version",
                    "echo $AWS_DEFAULT_REGION",
                    "aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin 713287342529.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com",
                  ],
                },
                build: {
                  commands: [
                    "echo Build started on `date`",
                    "echo Building the Docker image...",
                    "docker build -t $REPOSITORY_URI:latest .",
                    "docker push $REPOSITORY_URI:latest",
                  ],
                },
              },
            }),
            role: new Role(this, "CodeBuildRole", {
              assumedBy: new CompositePrincipal(
                new ServicePrincipal("codebuild.amazonaws.com"),
                new ServicePrincipal("codepipeline.amazonaws.com"),
              ),
              managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName(
                  "AmazonEC2ContainerRegistryFullAccess",
                ),
              ],
            }),
          }),
          input: sourceArtifact,
          outputs: [buildArtifact],
        }),
      ],
    });

    const cluster = new Cluster(this, "FargateCluster", {
      vpc: props.vpc,
      clusterName: "FargateCluster",
    });

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: new Role(this, "FargateTaskExecutionRole", {
        assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AmazonECSTaskExecutionRolePolicy",
          ),
          ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonEC2ContainerRegistryReadOnly",
          ),
        ],
      }),
    });

    taskDefinition.addContainer("AppContainer", {
      image: ContainerImage.fromEcrRepository(repository),
      portMappings: [{ containerPort: 3000 }],
    });

    const service = new ApplicationLoadBalancedFargateService(this, "Service", {
      cluster,
      taskDefinition,
      assignPublicIp: true,
      publicLoadBalancer: true,
      desiredCount: 1,
      listenerPort: 80,
      taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
    });

    pipeline.addStage({
      stageName: "DeployToFargate",
      actions: [
        new EcsDeployAction({
          actionName: "DeployToFargate",
          service: service.service,
          input: buildArtifact,
        }),
      ],
    });
  }
}
