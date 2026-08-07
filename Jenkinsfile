pipeline {
    agent any

    environment {
        SERVER = "ubuntu@54.221.18.30"
        APP_DIR = "/home/ubuntu/Cloud-Native-Medicine-Donation-Platform"
    }

    stages {

        stage('Deploy') {
            steps {
                sshagent(credentials: ['ec2-ssh']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SERVER} '
                        cd ${APP_DIR} &&
                        git pull origin main &&
                        npm install &&
                        npm run build &&
                        pm2 restart medicine-app &&
                        curl --fail http://127.0.0.1:3000/health
                    '
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }
    }
}