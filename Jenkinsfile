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
        cd $WORKSPACE

        docker compose down || true
        docker compose up -d --build
        '''
    }
}

        stage('Health Check') {
            steps {
                sh '''
                    sleep 15
                    curl http://localhost:3000/health
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