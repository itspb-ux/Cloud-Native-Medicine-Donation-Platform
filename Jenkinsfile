pipeline {
    agent any

    environment {
        IMAGE_NAME = "medicine-donation-platform-app"
        CONTAINER_NAME = "medicine-app"
    }

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

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $IMAGE_NAME .'
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    docker stop $CONTAINER_NAME || true
                    docker rm $CONTAINER_NAME || true

                    docker run -d \
                        --name $CONTAINER_NAME \
                        -p 3000:3000 \
                        --env-file .env \
                        $IMAGE_NAME
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 10
                    curl http://localhost:3000/health
                '''
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful!'
        }

        failure {
            echo 'Deployment Failed!'
        }
    }
}