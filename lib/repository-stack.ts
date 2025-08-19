import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from "constructs";

interface RepositoryStackProps extends StackProps {}

export class RepositoryStack extends Stack {
  repository: Repository;
  constructor(scope: Construct, id: string, props: RepositoryStackProps) {
    super(scope, id, props);

    this.repository = new Repository(this, "FargateRepository", {
      repositoryName: "laravel-app",
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
