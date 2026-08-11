pipeline {
agent any

```
environment {
    SERVER = "ubuntu@54.221.18.30"
    APP_DIR = "/home/ubuntu/Cloud-Native-Medicine-Donation-Platform"
    DEPLOYMENT = "medicine-app"
    IMAGE = "medicine-app:latest"
}

stages {

    stage('Deploy to EC2') {
        steps {
            sshagent(credentials: ['ec2-ssh']) {
                sh '''
                    ssh -o StrictHostKeyChecking=no ${SERVER} << 'EOF'
                    set -e

                    cd ${APP_DIR}

                    echo "===== Pulling latest code ====="
                    git pull origin main

                    echo "===== Building Docker image ====="
                    docker build -t ${IMAGE} .

                    echo "===== Loading image into Minikube ====="
                    minikube image load ${IMAGE}

                    echo "===== Restarting Kubernetes deployment ====="
                    kubectl rollout restart deployment ${DEPLOYMENT}

                    echo "===== Waiting for Kubernetes rollout ====="
                    kubectl rollout status deployment ${DEPLOYMENT} --timeout=120s

                    echo "===== Checking pods ====="
                    kubectl get pods

                    echo "===== Checking application health ====="
                    count=0

                    until curl -fs http://127.0.0.1:3000/health > /dev/null
                    do
                        count=$((count+1))

                        if [ $count -ge 30 ]; then
                            echo "Application health check failed."
                            kubectl get pods
                            kubectl logs deployment/${DEPLOYMENT} --tail=50 || true
                            exit 1
                        fi

                        echo "Waiting for application... ($count/30)"
                        sleep 2
                    done

                    echo "===== Health Check Passed ====="
                    curl http://127.0.0.1:3000/health

                    echo "===== Deployment Successful ====="
                    EOF
                '''
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
```

}
