pipeline {
  agent any

  environment {
    IMAGE_NAME = 'hms-backend'
    IMAGE_TAG = "${env.BUILD_NUMBER}"
    // Set in Jenkins credentials / global config for your registry
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
          sh 'npm ci || npm install'
          sh 'node --check src/index.js'
        }
      }
    }

    stage('Docker Build') {
      steps {
        dir('backend') {
          script {
            docker.build("${env.IMAGE_NAME}:${env.IMAGE_TAG}")
          }
        }
      }
    }

    stage('Docker Push') {
      when {
        expression { return env.REGISTRY != null && env.REGISTRY != '' }
      }
      steps {
        script {
          sh """
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:latest
            docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
            docker push ${REGISTRY}/${IMAGE_NAME}:latest
          """
        }
      }
    }

    stage('Deploy Kubernetes') {
      when {
        expression { return fileExists('k8s/deployment.yaml') }
      }
      steps {
        withKubeConfig([credentialsId: 'kubeconfig-credentials']) {
          sh """
            kubectl apply -f k8s/configmap.yaml
            kubectl apply -f k8s/deployment.yaml
            kubectl apply -f k8s/service.yaml
            kubectl set image deployment/hms-backend hms-backend=${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} || true
            kubectl rollout status deployment/hms-backend --timeout=120s
          """
        }
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
