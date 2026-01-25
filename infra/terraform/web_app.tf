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
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "VITE_API_NEED"
          value = "https://${aws_lb.alb.dns_name}/need"
        },
        {
          name  = "VITE_API_RESOURCE"
          value = "https://${aws_lb.alb.dns_name}/resources"
        },
        {
          name  = "VITE_API_AUTH"
          value = "https://${aws_lb.alb.dns_name}/auth"
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
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = false
  }

  desired_count = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.web_app_tg.arn
    container_name   = "web-app"
    container_port   = 80
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.web_app_tg, aws_lb.alb, aws_lb_listener.http, aws_cloudwatch_log_group.web_app]
}

resource "aws_cloudwatch_log_group" "web_app" {
  name              = "/ecs/web-app-${var.environment}"
  retention_in_days = 14
}
