// Application Load Balancer + target groups to expose services

resource "aws_security_group" "alb_sg" {
  name   = "knapsack-alb-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "ALB security group - allow HTTP from the internet"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "knapsack-alb-sg-${var.environment}"
  }
}

resource "aws_lb" "alb" {
  name               = "knapsack-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = aws_subnet.public[*].id

  tags = {
    Name = "knapsack-alb-${var.environment}"
  }
}

resource "aws_lb_target_group" "need_server_tg" {
  name        = "need-server-tg-${var.environment}"
  port        = 4020
  protocol    = "HTTP"
  vpc_id      = aws_vpc.knapsack.id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group" "resource_server_tg" {
  name        = "resource-server-tg-${var.environment}"
  port        = 4010
  protocol    = "HTTP"
  vpc_id      = aws_vpc.knapsack.id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group" "auth_server_tg" {
  name        = "auth-server-tg-${var.environment}"
  port        = 4001
  protocol    = "HTTP"
  vpc_id      = aws_vpc.knapsack.id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.need_server_tg.arn
  }
}

resource "aws_lb_listener_rule" "resource_path" {
  listener_arn = aws_lb_listener.http.arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.resource_server_tg.arn
  }

  condition {
    path_pattern {
      values = ["/resource*"]
    }
  }
}

resource "aws_lb_listener_rule" "auth_path" {
  listener_arn = aws_lb_listener.http.arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth_server_tg.arn
  }

  condition {
    path_pattern {
      values = ["/auth*"]
    }
  }
}

// Allow ALB to reach service container ports
resource "aws_security_group_rule" "alb_to_service_need" {
  type                     = "ingress"
  from_port                = 4020
  to_port                  = 4020
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service_sg.id
  source_security_group_id = aws_security_group.alb_sg.id
}

resource "aws_security_group_rule" "alb_to_service_resource" {
  type                     = "ingress"
  from_port                = 4010
  to_port                  = 4010
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service_sg.id
  source_security_group_id = aws_security_group.alb_sg.id
}

resource "aws_security_group_rule" "alb_to_service_auth" {
  type                     = "ingress"
  from_port                = 4001
  to_port                  = 4001
  protocol                 = "tcp"
  security_group_id        = aws_security_group.service_sg.id
  source_security_group_id = aws_security_group.alb_sg.id
}

output "alb_dns_name" {
  value = aws_lb.alb.dns_name
}
// ALB / target group placeholders for routing traffic to services in the test environment.

// Example: Application Load Balancer would be created here, with listeners and target groups
// mapping to ECS services. This file is a scaffold for later expansion.
