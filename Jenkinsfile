pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                sh 'rm -rf database/schema.sql || true'
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

                echo "Installing dependencies..."

                sh 'npm install'

                echo "Building TypeScript..."

                sh 'npm run build'
            }
        }



        stage('Clean Previous Deployment') {

            steps {

                sh '''
                set -e

                echo "Stopping previous compose deployment..."

                docker compose -p medicine-platform down -v --remove-orphans || true


                echo "Removing old volumes..."

                docker volume rm medicine-platform_postgres_data || true
                docker volume rm medicine-tracker_postgres_data || true
                docker volume rm medicine-tracker2_postgres_data || true
                docker volume rm cloud-native-medicine-donation-platform_postgres_data || true

                '''
            }
        }



        stage('Deploy') {

            steps {

                sh '''

                set -e


                echo "Starting Docker Compose..."


                docker compose -p medicine-platform up -d --build



                echo "Waiting for PostgreSQL..."



                until [ "$(docker compose -p medicine-platform ps -q postgres | xargs docker inspect -f '{{.State.Health.Status}}')" = "healthy" ];

                do

                    sleep 5

                done



                echo "PostgreSQL is ready"


                '''
            }
        }




        stage('Database Verification') {

            steps {

                sh '''

                echo "Checking database tables..."


                docker compose -p medicine-platform exec -T postgres \
                psql -U postgres -d medicine_donation -c "\\dt"


                '''
            }
        }




        stage('Application Health Check') {

            steps {

                sh '''

                echo "Waiting for application startup..."


                for i in $(seq 1 20)

                do


                    if curl --fail http://localhost:3000/health;

                    then

                        echo "Application is healthy"

                        exit 0

                    fi


                    sleep 5


                done



                echo "Application failed"



                docker compose -p medicine-platform logs app



                exit 1


                '''
            }
        }

    }



    post {


        success {

            echo '==================================='
            echo ' Application deployed successfully '
            echo '==================================='

        }



        failure {

            echo '==================================='
            echo ' Deployment failed '
            echo '==================================='


            sh '''

            echo "APP LOGS"

            docker compose -p medicine-platform logs app || true



            echo "POSTGRES LOGS"

            docker compose -p medicine-platform logs postgres || true


            '''

        }

    }

}