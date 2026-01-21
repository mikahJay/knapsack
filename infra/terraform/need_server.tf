// ECS task definition and service for need-server (Fargate skeleton)
// Adjust CPU, memory, and networking as needed.

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
      image     = "${aws_ecr_repository.need_server.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 4020, protocol = "tcp" }
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
    subnets         = aws_subnet.public[*].id
    security_groups = [aws_security_group.service_sg.id]
    assign_public_ip = true
  }

  desired_count = 1

  depends_on = [aws_ecs_cluster.knapsack]
}

// Create a log group for the service
resource "aws_cloudwatch_log_group" "need_server" {
  name              = "/ecs/need-server-${var.environment}"
  retention_in_days = 14
}
