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
ssh -o StrictHostKeyChecking=no ${SERVER} << EOF
set -e

cd ${APP_DIR}

echo "===== Pulling latest code ====="
git pull origin main

echo "===== Installing dependencies ====="
npm install

echo "===== Building project ====="
npm run build

echo "===== Restarting application ====="
pm2 restart medicine-app

echo "===== Waiting for application ====="

count=0

until curl -fs http://127.0.0.1:3000/health > /dev/null
do
    count=\$((count+1))

    if [ \$count -ge 15 ]; then
        echo "Application failed to start."
        pm2 status
        pm2 logs medicine-app --lines 50 --nostream || true
        exit 1
    fi

    echo "Waiting... (\$count/15)"
    sleep 2
done

echo "===== Health Check Passed ====="
curl http://127.0.0.1:3000/health

echo "===== Deployment Successful ====="
EOF
"""
                }
            }
        }
    }

    post {
        success {
            echo "==================================="
            echo "Deployment Successful"
            echo "==================================="
        }

        failure {
            echo "==================================="
            echo "Deployment Failed"
            echo "==================================="
        }
    }
}