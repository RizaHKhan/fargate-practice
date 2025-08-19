#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "dotenv/config";
import { NetworkingStack } from "../lib/networking-stack";
import { FargateServiceStack } from "../lib/fargate-service-stack";
import { RepositoryStack } from "../lib/repository-stack";

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};


const networkStack = new NetworkingStack(app, "NetworkingStack", {
  env,
});

const repositoryStack = new RepositoryStack(app, "RepositoryStack", {
  env,
});

new FargateServiceStack(app, "FargateServiceStack", {
  vpc: networkStack.vpc,
  appRepo: repositoryStack.appRepo,
  serverRepo: repositoryStack.serverRepo,
  env,
});
