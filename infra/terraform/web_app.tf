// ECS task definition and service for web-app (Fargate)

resource "aws_ecs_task_definition" "web_app" {
  family                   = "web-app-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  task_role_arn      = module.iam.service_role_arn
  execution_role_arn = module.iam.service_role_arn

  container_definitions = jsonencode([
    {
      name      = "web-app"
      image     = "${aws_ecr_repository.web_app.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        { containerPort = 80, protocol = "tcp" }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "VITE_API_NEED"
          # use the public domain name (matches ACM certificate) so browser TLS succeeds;
          # components append /needs when calling the API
          value = "https://${var.domain_name}"
        },
        {
          name  = "VITE_API_RESOURCE"
          # use the public domain name (matches ACM certificate)
          value = "https://${var.domain_name}"
        },
        {
          name  = "VITE_API_AUTH"
          # auth endpoints live under the same public domain
          value = "https://${var.domain_name}/auth"
        }
        ,{
          name  = "VITE_GOOGLE_CLIENT_ID"
          value = var.google_client_id
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/web-app-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "web_app" {
  name            = "web-app-${var.environment}"
  cluster         = aws_ecs_cluster.knapsack.id
  task_definition = aws_ecs_task_definition.web_app.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = true
  }

  desired_count = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.web_app_tg.arn
    container_name   = "web-app"
    container_port   = 80
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.web_app_tg, aws_lb.alb, aws_lb_listener.https, aws_cloudwatch_log_group.web_app]
}

resource "aws_cloudwatch_log_group" "web_app" {
  name              = "/ecs/web-app-${var.environment}"
  retention_in_days = 14
}
