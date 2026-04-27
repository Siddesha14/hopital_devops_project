pipeline {
  agent any

  environment {
    IMAGE_NAME = 'hms-backend'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    REGISTRY = "${env.DOCKER_REGISTRY ?: 'localhost:5000'}"
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
          // Use 'bat' for Windows commands
          bat 'npm ci || npm install'
          bat 'node --check src/index.js'
        }
      }
    }

    stage('Docker Build') {
      steps {
        dir('backend') {
          // Changed to 'bat' to avoid needing Jenkins plugins
          bat "docker build -t %IMAGE_NAME%:%IMAGE_TAG% ."
          bat "docker tag %IMAGE_NAME%:%IMAGE_TAG% %IMAGE_NAME%:latest"
        }
      }
    }

    stage('Deploy Kubernetes') {
      when {
        expression { return fileExists('k8s/deployment.yaml') }
      }
      steps {
        // Updated to use 'bat' for kubectl
        bat "kubectl apply -f k8s/configmap.yaml"
        bat "kubectl apply -f k8s/deployment.yaml"
        bat "kubectl apply -f k8s/service.yaml"
        bat "kubectl rollout status deployment/hms-backend --timeout=120s"
      }
    }
  }

  post {
    failure {
      echo 'Pipeline failed — check logs for npm, Docker, or kubectl errors.'
    }
    success {
      echo 'Pipeline completed successfully.'
    }
  }
}
