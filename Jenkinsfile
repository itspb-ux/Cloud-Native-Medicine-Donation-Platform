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

        cd /project

        docker rm -f medicine-app medicine-postgres || true
        docker compose down -v || true

        docker compose up -d --build

        until [ "$(docker inspect -f '{{.State.Health.Status}}' medicine-postgres)" = "healthy" ]; do
            sleep 5
        done
        '''
    }
}

       stage('Health Check') {
    steps {
        sh '''
        echo "Waiting for application..."

        for i in $(seq 1 20); do
            if curl --fail http://172.17.0.1:3000/health; then
                echo "Application is healthy."
                exit 0
            fi
            sleep 5
        done

        echo "Health check failed!"
        docker logs medicine-app
        exit 1
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