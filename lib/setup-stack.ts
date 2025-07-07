import { SecretValue, Stack, StackProps } from "aws-cdk-lib";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface SetupStackProps extends StackProps {
  githubToken?: string;
}

export class SetupStack extends Stack {
  secret: Secret;

  constructor(scope: Construct, id: string, props: SetupStackProps) {
    super(scope, id, props);

    if (props.githubToken) {
      this.secret = new Secret(this, "GithubToken", {
        secretStringValue: SecretValue.unsafePlainText(props.githubToken),
      });
    }
  }
}
