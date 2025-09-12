# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands \* `npm run build` compile typescript to js

- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Connect to container

```bash
aws ecs execute-command --cluster {clusterName} \
--task {arn} \
--container {containerName} \
--command "/bin/bash" \
--interactive
```

```bash
docker pull 713287342529.dkr.ecr.us-east-1.amazonaws.com/site:latest
docker run -d --rm -p 9000:9000 713287342529.dkr.ecr.us-east-1.amazonaws.com/app:latest

docker pull 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker run -d --rm -p 80:80 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
```

## Steps

[ ] Same setup, except use Github actions to perform all of the CICD work.
[ ] Build the final service in the final stack because we will need the ECR containers built out for use

## Infrastructure

| Stack               | Provisions                          | Exports                             |
| ------------------- | ----------------------------------- | ----------------------------------- |
| NetworkingStack     | VPC, ALB, Listener, Security Groups | VPC, ALB, Listener, Security Groups |
| ClusterStack        | ECS Cluster                         | Cluster                             |
| TaskDefinitionStack | ECS Task Definitions                | Task Definitions                    |
| DatabaseStack       | DB Resources                        | DB Info                             |
| ServiceStack        | ECS Service                         | Uses all above                      |


