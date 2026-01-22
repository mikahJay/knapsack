// ECS task definition and service for auth-server (Fargate skeleton)
// Mirrors need-server and resource-server configuration.

resource "aws_ecs_task_definition" "auth_server" {
  family                   = "auth-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  task_role_arn      = module.iam.service_role_arn
  execution_role_arn = module.iam.service_role_arn

  container_definitions = jsonencode([
    {
      name      = "auth-server"
      image     = "${aws_ecr_repository.auth_server.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 4001, protocol = "tcp" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/auth-server-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "auth_server" {
  name            = "auth-server-${var.environment}"
  cluster         = aws_ecs_cluster.knapsack.id
  task_definition = aws_ecs_task_definition.auth_server.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = false
  }

  desired_count = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.auth_server_tg.arn
    container_name   = "auth-server"
    container_port   = 4001
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.auth_server_tg, aws_lb.alb, aws_lb_listener.http, aws_cloudwatch_log_group.auth_server]
}

// Create a log group for the service
resource "aws_cloudwatch_log_group" "auth_server" {
  name              = "/ecs/auth-server-${var.environment}"
  retention_in_days = 14
}
