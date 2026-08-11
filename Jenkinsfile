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

                sh """
                    ssh -o StrictHostKeyChecking=no ${SERVER} << EOF

                    set -e

                    echo "===== DEPLOYMENT STARTED ====="

                    cd ${APP_DIR}

                    echo "===== Pulling latest code from GitHub ====="
                    git pull origin main

                    echo "===== Building Docker image ====="
                    docker build -t ${IMAGE} .

                    echo "===== Loading Docker image into Minikube ====="
                    minikube image load ${IMAGE}

                    echo "===== Restarting Kubernetes deployment ====="
                    kubectl rollout restart deployment ${DEPLOYMENT}

                    echo "===== Waiting for Kubernetes rollout ====="
                    kubectl rollout status deployment ${DEPLOYMENT} --timeout=120s

                    echo "===== Checking Kubernetes pods ====="
                    kubectl get pods

                    echo "===== Waiting for application health ====="

                    count=0

                    until curl -fs http://127.0.0.1:3000/health > /dev/null
                    do
                        count=\$((count+1))

                        if [ \$count -ge 30 ]; then
                            echo "===== HEALTH CHECK FAILED ====="
                            kubectl get pods
                            kubectl logs deployment/${DEPLOYMENT} --tail=50 || true
                            exit 1
                        fi

                        echo "Application not ready (\$count/30)..."
                        sleep 2
                    done

                    echo "===== HEALTH CHECK PASSED ====="
                    curl http://127.0.0.1:3000/health

                    echo ""
                    echo "===== FINAL POD STATUS ====="
                    kubectl get pods

                    echo ""
                    echo "===== DEPLOYMENT SUCCESSFUL ====="

                    EOF
                """
            }
        }
    }
}

post {

    success {
        echo "======================================"
        echo "     DEPLOYMENT SUCCESSFUL"
        echo "======================================"
    }

    failure {
        echo "======================================"
        echo "       DEPLOYMENT FAILED"
        echo "======================================"
    }
}
```

}
