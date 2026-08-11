pipeline {
    agent any

    environment {
        SERVER = "ubuntu@54.221.18.30"
        APP_DIR = "/home/ubuntu/Cloud-Native-Medicine-Donation-Platform"
        IMAGE_NAME = "medicine-app:latest"
        DEPLOYMENT = "medicine-app"
    }

    stages {

        stage('Checkout') {
            steps {
                echo "===== Checking out latest code ====="
                checkout scm
            }
        }

        stage('Deploy to EC2') {
            steps {

                sshagent(credentials: ['ec2-ssh']) {

                    sh """
                        ssh -o StrictHostKeyChecking=no ${SERVER} << 'EOF'

                        set -e

                        echo "======================================"
                        echo "      MEDICINE APP CI/CD DEPLOYMENT"
                        echo "======================================"

                        cd ${APP_DIR}

                        echo ""
                        echo "===== Pulling latest code ====="
                        git pull origin main

                        echo ""
                        echo "===== Building Docker image ====="
                        docker build -t ${IMAGE_NAME} .

                        echo ""
                        echo "===== Loading image into Minikube ====="
                        minikube image load ${IMAGE_NAME} --overwrite=true

                        echo ""
                        echo "===== Restarting Kubernetes deployment ====="
                        kubectl rollout restart deployment ${DEPLOYMENT}

                        echo ""
                        echo "===== Waiting for Kubernetes rollout ====="
                        kubectl rollout status deployment ${DEPLOYMENT} --timeout=180s

                        echo ""
                        echo "===== Checking Kubernetes pods ====="
                        kubectl get pods

                        echo ""
                        echo "===== Checking Kubernetes services ====="
                        kubectl get svc

                        echo ""
                        echo "===== Checking application health ====="

                        count=0

                        until curl -fs http://127.0.0.1/health > /dev/null
                        do
                            count=\\$((count+1))

                            if [ \\$count -ge 30 ]; then
                                echo "Application health check failed."

                                echo ""
                                echo "===== Pod Status ====="
                                kubectl get pods

                                echo ""
                                echo "===== Application Logs ====="
                                kubectl logs deployment/${DEPLOYMENT} --tail=100 || true

                                exit 1
                            fi

                            echo "Waiting for application... (\\$count/30)"
                            sleep 2
                        done

                        echo ""
                        echo "===== Health Check Passed ====="
                        curl http://127.0.0.1/health

                        echo ""
                        echo "===== Deployment Successful ====="

                        EOF
                    """
                }
            }
        }
    }

    post {

        success {
            echo """
            ==========================================
                    DEPLOYMENT SUCCESSFUL
            ==========================================
            Application deployed using:

            GitHub
               ↓
            Jenkins
               ↓
            Docker
               ↓
            Minikube
               ↓
            Kubernetes
               ↓
            Nginx
               ↓
            Public IP
            ==========================================
            """
        }

        failure {
            echo """
            ==========================================
                    DEPLOYMENT FAILED
            ==========================================
            Check the Jenkins console output.
            ==========================================
            """
        }
    }
}