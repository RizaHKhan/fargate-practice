# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

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
aws ecs execute-command --cluster FargateCluster \
--task arn:aws:ecs:us-east-1:713287342529:task/FargateCluster/87c9939d7fc04348816998c8c3339d84 \
--container ServerContainer \
--command "/bin/bash" \
--interactive

aws ecs execute-command --cluster FargateCluster \
--task arn:aws:ecs:us-east-1:713287342529:task/FargateCluster/241ec6c61563453393fce417c824d0c0 |
--container AppContainer \
--command "/bin/bash" \
--interactive

`--container`: ContainerName
```

```bash
docker pull 713287342529.dkr.ecr.us-east-1.amazonaws.com/app:latest
docker run -d --rm -p 9000:9000 713287342529.dkr.ecr.us-east-1.amazonaws.com/app:latest

docker pull 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
docker run -d --rm -p 80:80 713287342529.dkr.ecr.us-east-1.amazonaws.com/server:latest
```
