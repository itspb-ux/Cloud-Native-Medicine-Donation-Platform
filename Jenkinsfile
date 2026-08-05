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

        echo "Stopping old containers..."

        docker rm -f medicine-app medicine-postgres || true

        echo "Removing old database volumes..."

        docker volume rm medicine-tracker_postgres_data || true
        docker volume rm medicine-tracker2_postgres_data || true
        docker volume rm cloud-native-medicine-donation-platform_postgres_data || true

        echo "Starting application..."

        cd "$WORKSPACE"

        docker compose -p medicine-platform down -v || true

        docker compose -p medicine-platform up -d --build


        echo "Waiting for postgres..."

        until [ "$(docker inspect -f '{{.State.Health.Status}}' medicine-postgres)" = "healthy" ]; do
            sleep 5
        done


        echo "Deployment completed"
        '''
    }
}

        stage('Health Check') {

steps {

sh '''

echo "Checking application..."

for i in $(seq 1 20)
do

STATUS=$(docker inspect -f '{{.State.Status}}' medicine-app)

if [ "$STATUS" = "running" ]; then

echo "Application container is running"

curl --fail http://localhost:3000/health

exit 0

fi

sleep 5

done


echo "Health check failed"

docker logs medicine-app

exit 1

'''
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