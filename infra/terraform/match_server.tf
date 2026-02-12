// ECS task definition and service for match-server (Fargate skeleton)
// Mirrors need-server and resource-server configuration so all services follow the same pattern.

resource "aws_ecs_task_definition" "match_server" {
  family                   = "match-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  task_role_arn      = module.iam.service_role_arn
  execution_role_arn = module.iam.service_role_arn

  container_definitions = jsonencode([
    {
      name      = "match-server"
      image     = "${aws_ecr_repository.match_server.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        { containerPort = 4030, protocol = "tcp" }
      ]
      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://127.0.0.1:4030/health', res => { process.exit(res.statusCode >= 200 && res.statusCode < 400 ? 0 : 1) }).on('error', () => process.exit(1))\""]
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
          value = var.google_client_id
        },
        {
          name  = "DOMAIN_NAME"
          value = var.domain_name
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/match-server-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "match_server" {
  name            = "match-server-${var.environment}"
  cluster         = aws_ecs_cluster.knapsack.id
  task_definition = aws_ecs_task_definition.match_server.arn
  launch_type     = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = true
  }

  desired_count = 2

  load_balancer {
    target_group_arn = aws_lb_target_group.match_server_tg.arn
    container_name   = "match-server"
    container_port   = 4030
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.match_server_tg, aws_lb.alb, aws_lb_listener.https, aws_lb_listener_rule.match_path_https, aws_cloudwatch_log_group.match_server]
}

// Create a log group for the service
resource "aws_cloudwatch_log_group" "match_server" {
  name              = "/ecs/match-server-${var.environment}"
  retention_in_days = 14
}
