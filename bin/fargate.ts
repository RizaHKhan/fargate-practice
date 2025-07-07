#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "dotenv/config";
import { SetupStack } from "../lib/setup-stack";
import { NetworkingStack } from "../lib/networking-stack";
import { RepositoryStack } from "../lib/repository-stack";
import { FargateServiceStack } from "../lib/fargate-service-stack";

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
  githubToken: process.env.GITHUB_TOKEN,
};

const secretStack = new SetupStack(app, "SetupStack", {
  githubToken: process.env.GITHUB_TOKEN,
});

const networkStack = new NetworkingStack(app, "NetworkingStack", {
  env,
});

const repositoryStack = new RepositoryStack(app, "RepositoryStack", {
  secret: secretStack.secret,
});

new FargateServiceStack(app, "FargateServiceStack", {
  vpc: networkStack.vpc,
  repository: repositoryStack.repository,
  env
});

