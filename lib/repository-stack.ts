import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

interface RepositoryStackProps extends StackProps {}

export class RepositoryStack extends Stack {
  app1Repo: Repository;
  app2Repo: Repository;
  phpRepo: Repository;
  proxyRepo: Repository;

  constructor(scope: Construct, id: string, props: RepositoryStackProps) {
    super(scope, id, props);

    this.app1Repo = new Repository(this, "FargateApp1Repository", {
      repositoryName: "app1",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.app2Repo = new Repository(this, "FargateApp2Repository", {
      repositoryName: "app2",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.phpRepo = new Repository(this, "FargatePHPRepository", {
      repositoryName: "php",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.proxyRepo = new Repository(this, "FargateProxyRepository", {
      repositoryName: "proxy",
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
