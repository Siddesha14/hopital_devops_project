pipeline {
  agent any

  environment {
    IMAGE_NAME = 'hms-backend'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install & Test Backend') {
      steps {
        dir('backend') {
          bat 'npm ci || npm install'
          bat 'node --check src/index.js'
        }
      }
    }

    stage('Docker Build') {
      steps {
        dir('backend') {
          bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% ."
          bat "docker tag %IMAGE_NAME%:%IMAGE_TAG% %IMAGE_NAME%:latest"
        }
      }
    }

    stage('Docker Run') {
      steps {
        bat 'docker stop hms-backend || exit 0'
        bat 'docker rm hms-backend || exit 0'
        bat 'docker run -d --name hms-backend -p 3000:3000 hms-backend:latest'
      }
    }

  }

  post {
    failure {
      echo 'Pipeline failed — check Jenkins console logs.'
    }

    success {
      echo 'Pipeline completed successfully.'
    }
  }
}