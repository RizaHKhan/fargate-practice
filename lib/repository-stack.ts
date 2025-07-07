import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "aws-cdk-lib/aws-codebuild";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import {
  CodeBuildAction,
  GitHubSourceAction,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage, FargateTaskDefinition } from "aws-cdk-lib/aws-ecs";
import {
  CompositePrincipal,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface RepositoryStackProps extends StackProps {
  secret: Secret;
}

export class RepositoryStack extends Stack {
  repository: Repository;

  constructor(scope: Construct, id: string, props: RepositoryStackProps) {
    super(scope, id, props);

    this.repository = new Repository(this, "FargateRepository", {
      repositoryName: "fargate-repository",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const sourceArtifact = new Artifact("SourceArtifact");

    const pipeline = new Pipeline(this, "FargatePipeline", {
      pipelineName: "FargatePipelinez",
      role: new Role(this, "FargatePipelineRole", {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal("codebuild.amazonaws.com"),
          new ServicePrincipal("codepipeline.amazonaws.com"),
        ),
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

    const buildArtifact = new Artifact("BuildArtifact");

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
              REPOSITORY_URI: { value: this.repository.repositoryUri },
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
  }
}
