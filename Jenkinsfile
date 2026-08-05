pipeline {
    agent any

    environment {
        APP_DIR = "/home/ubuntu/Cloud-Native-Medicine-Donation-Platform"
    }

    stages {

        stage('Checkout') {
            steps {
                dir("${APP_DIR}") {
                    checkout scm
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm install'
                }
            }
        }

        stage('Build') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm run build'
                }
            }
        }

        stage('Seed Database') {
            steps {
                dir("${APP_DIR}") {
                    sh 'npm run db:seed'
                }
            }
        }

        stage('Restart Application') {
            steps {
                dir("${APP_DIR}") {
                    sh '''
                    if pm2 list | grep -q medicine-app; then
                        pm2 restart medicine-app
                    else
                        pm2 start npm --name medicine-app -- start
                    fi

                    pm2 save
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                sleep 5
                curl --fail http://localhost:3000/health
                '''
            }
        }
    }

    post {

        success {
            echo "===================================="
            echo " Deployment Successful "
            echo "===================================="
        }

        failure {
            echo "===================================="
            echo " Deployment Failed "
            echo "===================================="

            sh '''
            pm2 logs medicine-app --lines 50 || true
            '''
        }
    }
}