import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { Repository } from 'aws-cdk-lib/aws-ecr'
import { Construct } from 'constructs'

interface RepositoryStackProps extends StackProps {
    name: string
    repoName: string
}

export class RepositoryStack extends Stack {
    repo: Repository

    constructor(scope: Construct, id: string, props: RepositoryStackProps) {
        super(scope, id, props)

        this.repo = new Repository(this, props.name, {
            repositoryName: props.repoName,
            removalPolicy: RemovalPolicy.DESTROY,
        })
    }
}
