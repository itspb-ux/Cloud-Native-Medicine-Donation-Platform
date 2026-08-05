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


                echo "Cleaning old containers"


                docker rm -f medicine-app medicine-postgres || true


                docker compose -p medicine-platform down -v || true


                echo "Starting containers"


                docker compose -p medicine-platform up -d --build



                echo "Waiting for PostgreSQL"


                until [ "$(docker inspect -f '{{.State.Health.Status}}' medicine-postgres)" = "healthy" ];

                do

                    sleep 5

                done



                echo "Deployment complete"


                '''

            }

        }



        stage('Health Check') {


            steps {


                sh '''


                echo "Checking application health"



                for i in $(seq 1 20)

                do


                    if curl --fail http://localhost:3000/health;

                    then


                        echo "Application is healthy"

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