# GEMINI.md

## Project Overview

This project is an AWS CDK application written in TypeScript. It defines the infrastructure for a Fargate application, including networking, databases, and containerized services. The application appears to be a PHP application (likely Laravel) with a companion "site" service, possibly for a frontend or a content management system.

The infrastructure is defined across multiple stacks:

*   **`NetworkingStack`**: Creates the VPC, subnets, security groups, and an Application Load Balancer.
*   **`DatabaseStack`**: Provisions an RDS database.
*   **`ClusterStack`**: Sets up an ECS Cluster.
*   **`RepositoryStack`**: Creates ECR repositories for the container images.
*   **`TaskStack`**: Defines the ECS task definitions for the `app` and `site` services.
*   **`FargateServiceStack`**: Creates the Fargate services that run the tasks.

## Building and Running

### Build

To compile the TypeScript code, run:

```bash
npm run build
```

### Testing

To run the unit tests, use:

```bash
npm run test
```

### Deployment

To deploy the CDK application to your default AWS account and region, use the following command:

```bash
npx cdk deploy
```

You can also use the following commands to inspect the stack before deploying:

*   `npx cdk diff`: Compare the deployed stack with the current state.
*   `npx cdk synth`: Emits the synthesized CloudFormation template.

## Development Conventions

*   The project uses TypeScript for infrastructure as code.
*   The code is organized into a series of stacks in the `lib/` directory.
*   The main application entry point is `bin/fargate.ts`.
*   The project uses `jest` for testing.
*   Dependencies are managed with `npm`.
