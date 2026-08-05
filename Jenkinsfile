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
        sh 'npm install'
    }
}

stage('Build') {
    steps {
        sh 'npm run build'
    }
}

stage('Restart PM2') {
    steps {
        sh '''
        pm2 restart medicine-app || pm2 start npm --name medicine-app -- start
        '''
    }
}

stage('Health Check') {
    steps {
        sh 'curl --fail http://localhost:3000/health'
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