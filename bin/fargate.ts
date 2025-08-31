#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import "dotenv/config";
import { NetworkingStack } from "../lib/networking-stack";
import { FargateServiceStack } from "../lib/fargate-service-stack";
import { RepositoryStack } from "../lib/repository-stack";
import { DatabaseStack } from "../lib/database-stack";
import { Secret as ECSSecret } from "aws-cdk-lib/aws-ecs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

const app = new App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const networkStack = new NetworkingStack(app, "NetworkingStack", {
  env,
});

const dbStack = new DatabaseStack(app, "DatabaseStack", {
  env,
  vpc: networkStack.vpc,
});

const siteRepoStack = new RepositoryStack(app, "SiteRepositoryStack", {
  env,
  name: "FargateSiteRepository",
  repoName: "site",
});

const appRepoStack = new RepositoryStack(app, "AppRepositoryStack", {
  env,
  name: "FargateAppRepository",
  repoName: "app",
});

new FargateServiceStack(app, "FargateSiteServiceStack", {
  vpc: networkStack.vpc,
  prefix: "site",
  repo: siteRepoStack.repo,
  env,
  secrets: {
    WP_DB_HOST: ECSSecret.fromSecretsManager(dbStack.db.secret!, "host"),
    WP_DB_NAME: ECSSecret.fromSecretsManager(dbStack.db.secret!, "dbname"),
    WP_DB_PASSWORD: ECSSecret.fromSecretsManager(
      dbStack.db.secret!,
      "password",
    ),
    WP_DB_USER: ECSSecret.fromSecretsManager(dbStack.db.secret!, "username"),
    WP_AUTH_KEY: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_AUTH_KEY", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_AUTH_KEY",
        },
      }),
    ),
    WP_AUTH_SALT: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_AUTH_SALT", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_AUTH_SALT",
        },
      }),
    ),
    WP_LOGGED_IN_KEY: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_LOGGED_IN_KEY", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_LOGGED_IN_KEY",
        },
      }),
    ),
    WP_LOGGED_IN_SALT: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_LOGGED_IN_SALT", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_LOGGED_IN_SALT",
        },
      }),
    ),
    WP_NONCE_KEY: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_NONCE_KEY", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_NONCE_KEY",
        },
      }),
    ),
    WP_NONCE_SALT: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_NONCE_SALT", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_NONCE_SALT",
        },
      }),
    ),
    WP_SECURE_AUTH_KEY: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_SECURE_AUTH_KEY", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_SECURE_AUTH_KEY",
        },
      }),
    ),
    WP_SECURE_AUTH_SALT: ECSSecret.fromSecretsManager(
      new Secret(siteRepoStack, "WP_SECURE_AUTH_SALT", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          generateStringKey: "WP_SECURE_AUTH_SALT",
        },
      }),
    ),
  },
});

new FargateServiceStack(app, "FargateAppServiceStack", {
  vpc: networkStack.vpc,
  prefix: "app",
  repo: appRepoStack.repo,
  env,
  environment: {
    NODE_ENV: "http://localhost",
    APP_LOCALE: "en",
    APP_DEBUG: "false",
    APP_ENV: "staging",
    APP_NAME: "Laravel",
    APP_FAKER_LOCALE: "en_US",
    APP_MAINTENANCE_DRIVER: "database",
    APP_FALLBACK_LOCALE: "en",
    DB_CONNECTION: "mysql",
  },
  secrets: {
    DB_DATABASE: ECSSecret.fromSecretsManager(dbStack.db.secret!, "dbname"),
    DB_HOST: ECSSecret.fromSecretsManager(dbStack.db.secret!, "host"),
    DB_PASSWORD: ECSSecret.fromSecretsManager(dbStack.db.secret!, "password"),
    DB_PORT: ECSSecret.fromSecretsManager(dbStack.db.secret!, "port"),
    DB_USERNAME: ECSSecret.fromSecretsManager(dbStack.db.secret!, "username"),
    APP_KEY: ECSSecret.fromSecretsManager(
      new Secret(appRepoStack, "APP_KEY", {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({}),
          excludePunctuation: true,
          includeSpace: false,
          passwordLength: 32,
          generateStringKey: "APP_KEY",
        },
      }),
    ),
  },
});
