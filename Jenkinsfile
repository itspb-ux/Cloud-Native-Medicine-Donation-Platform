pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/itspb-ux/Cloud-Native-Medicine-Donation-Platform.git'
            }
        }

        stage('Build TypeScript') {
            agent {
                docker {
                    image 'node:20'
                    reuseNode true
                }
            }

            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }

stage('Deploy') {
    steps {
        sh '''
        set -e

        echo "Current workspace:"
        pwd

        echo "Project files:"
        ls -la
        ls -la database

        docker compose down -v || true

        docker compose up -d --build

        echo "Waiting for PostgreSQL..."
        until [ "$(docker inspect -f '{{.State.Health.Status}}' medicine-postgres 2>/dev/null)" = "healthy" ]; do
            sleep 5
        done

        echo "PostgreSQL is healthy."

        docker ps
        '''
    }
}

        stage('Health Check') {
    steps {
        sh '''
        sleep 10
        curl --fail http://localhost:3000/health
        '''
    }
}
    }

    post {
        success {
            echo 'Application deployed successfully!'
        }

        failure {
            echo 'Deployment failed!'
        }
    }
}