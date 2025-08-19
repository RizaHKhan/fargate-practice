import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

interface RepositoryStackProps extends StackProps {}

export class RepositoryStack extends Stack {
  appRepo: Repository;
  serverRepo: Repository;
  constructor(scope: Construct, id: string, props: RepositoryStackProps) {
    super(scope, id, props);

    this.appRepo = new Repository(this, "FargateAppRepository", {
      repositoryName: "app",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.serverRepo = new Repository(this, "FargateServerRepository", {
      repositoryName: "server",
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
