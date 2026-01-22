// ECS task definition and service for resource-server (Fargate skeleton)
// Mirrors need-server configuration so both services follow the same pattern.

resource "aws_ecs_task_definition" "resource_server" {
  family                   = "resource-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  task_role_arn      = module.iam.service_role_arn
  execution_role_arn = module.iam.service_role_arn

  container_definitions = jsonencode([
    {
      name      = "resource-server"
      image     = "${aws_ecr_repository.resource_server.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 4010, protocol = "tcp" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/resource-server-${var.environment}"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "resource_server" {
  name            = "resource-server-${var.environment}"
  cluster         = aws_ecs_cluster.knapsack.id
  task_definition = aws_ecs_task_definition.resource_server.arn
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.service_sg.id]
    assign_public_ip = false
  }

  desired_count = 1

  load_balancer {
    target_group_arn = aws_lb_target_group.resource_server_tg.arn
    container_name   = "resource-server"
    container_port   = 4010
  }

  depends_on = [aws_ecs_cluster.knapsack, aws_lb_target_group.resource_server_tg, aws_lb.alb, aws_lb_listener.http, aws_lb_listener_rule.resource_path, aws_cloudwatch_log_group.resource_server]
}

// Create a log group for the service
resource "aws_cloudwatch_log_group" "resource_server" {
  name              = "/ecs/resource-server-${var.environment}"
  retention_in_days = 14
}
