// ECS task definition and service for need-server (Fargate skeleton)
// Mirrors resource-server configuration so both services follow the same pattern.

resource "aws_ecs_task_definition" "need_server" {
  family                   = "need-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  task_role_arn      = module.iam.service_role_arn
  execution_role_arn = module.iam.service_role_arn

  container_definitions = jsonencode([
    {
      name      = "need-server"
      image     = "${aws_ecr_repository.need_server.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        { containerPort = 4020, protocol = "tcp" }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:4020/health', res => { process.exit(res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1) }).on('error', () => process.exit(1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 10
      }
      secrets = [
        {
          name      = "DB_CREDENTIALS"
          valueFrom = aws_secretsmanager_secret.db_credentials.arn
        }
      ]
      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.knapsack.address
        },
        {
          name  = "DB_PORT"
          value = tostring(aws_db_instance.knapsack.port)
        },
        {
          name  = "DB_NAME"
          value = aws_db_instance.knapsack.db_name
        }
        ,
        {
          name  = "DB_SSL"
          value = "true"
        },
        {
          name  = "GOOGLE_CLIENT_ID"
          value = var.google_client_id        },
        {
          name  = "DOMAIN_NAME"
          value = var.domain_name        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/need-server-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "need_server" {
  name            = "need-server-${var.environment}"
  cluster         = aws_ecs_cluster.knapsack.id
  task_definition = aws_ecs_task_definition.need_server.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = false
  }

  desired_count = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.need_server_tg.arn
    container_name   = "need-server"
    container_port   = 4020
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.need_server_tg, aws_lb.alb, aws_lb_listener.https, aws_cloudwatch_log_group.need_server]
}

// Create a log group for the service
resource "aws_cloudwatch_log_group" "need_server" {
  name              = "/ecs/need-server-${var.environment}"
  retention_in_days = 14
}

