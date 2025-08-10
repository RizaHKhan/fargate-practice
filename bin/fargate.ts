#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "dotenv/config";
import { SetupStack } from "../lib/setup-stack";
import { NetworkingStack } from "../lib/networking-stack";
import { FargateServiceStack } from "../lib/fargate-service-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
  githubToken: process.env.GITHUB_TOKEN,
};

const secretStack = new SetupStack(app, "SetupStack", {
  githubToken: process.env.GITHUB_TOKEN,
  env,
});

const networkStack = new NetworkingStack(app, "NetworkingStack", {
  env,
});

const pipelineStack = new PipelineStack(app, "PipelineStack", {
  secret: secretStack.secret,
  env,
});

new FargateServiceStack(app, "FargateServiceStack", {
  vpc: networkStack.vpc,
  repository: pipelineStack.repository,
  env,
});
