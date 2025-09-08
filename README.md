# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands \* `npm run build` compile typescript to js

- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Pushing to Remote

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 713287342529.dkr.ecr.us-east-1.amazonaws.com

```

Nginx:

```bash
docker tag single-container-app:latest 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker push 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest

docker tag fargate-nginx:latest 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker push 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest

docker tag laravel-app:latest 713287342529.dkr.ecr.us-east-1.amazonaws.com/app:latest
docker push 713287342529.dkr.ecr.us-east-1.amazonaws.com/app:latest
```

## Connect to container

```bash
aws ecs execute-command --cluster FargateCluster-site \
--task arn:aws:ecs:us-east-1:713287342529:task/FargateCluster-site/a16ca56a3ae345bb953aa3eca98ed292 \
--container site-Container \
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

## RDS

```
DatabaseStack.DBEndpoint = databasestack-mariadbinstance7ffcd3a5-lfevwkwdlblw.cqbgqsg2iymb.us-east-1.rds.amazonaws.com
DatabaseStack.DBPort = 3306
```

```bash
mysql -h databasestack-mariadbinstance7ffcd3a5-lfevwkwdlblw.cqbgqsg2iymb.us-east-1.rds.amazonaws.com -P 3306 -u khanr -p
```

## Infrastructure

| Stack               | Provisions                          | Exports                             |
| ------------------- | ----------------------------------- | ----------------------------------- |
| NetworkingStack     | VPC, ALB, Listener, Security Groups | VPC, ALB, Listener, Security Groups |
| ClusterStack        | ECS Cluster                         | Cluster                             |
| TaskDefinitionStack | ECS Task Definitions                | Task Definitions                    |
| DatabaseStack       | DB Resources                        | DB Info                             |
| ServiceStack        | ECS Service                         | Uses all above                      |
