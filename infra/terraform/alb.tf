// Application Load Balancer + target groups to expose services

locals {
  effective_acm_arn = var.acm_certificate_arn != "" ? var.acm_certificate_arn : try(aws_acm_certificate.cert.arn, "")
}

resource "aws_security_group" "alb_sg" {
  name   = "knapsack-alb-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "ALB security group - allow HTTP from the internet"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = concat(["0.0.0.0/0"], var.allowed_alb_cidr_blocks)
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = concat(["0.0.0.0/0"], var.allowed_alb_cidr_blocks)
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
    path                = "/health"
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
    path                = "/health"
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
    path                = "/health"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group" "web_app_tg" {
  name        = "web-app-tg-${var.environment}"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.knapsack.id
  target_type = "ip"

  health_check {
    path                = "/health"
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
    type = "redirect"

    redirect {
      protocol    = "HTTPS"
      port        = "443"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS listener (requires ACM certificate ARN via variable)
resource "aws_lb_listener" "https" {
  count             = (var.acm_certificate_arn != "" || var.create_acm) ? 1 : 0
  load_balancer_arn = aws_lb.alb.arn
  port              = "443"
  protocol          = "HTTPS"
  certificate_arn   = local.effective_acm_arn
  depends_on        = [aws_acm_certificate_validation.cert_validation]

  default_action {
    type             = "forward"
    # Default to the web app so requests to the root domain go to the SPA
    target_group_arn = aws_lb_target_group.web_app_tg.arn
  }
}

# Duplicate listener rules for HTTPS if cert provided
resource "aws_lb_listener_rule" "resource_path_https" {
  count        = (var.acm_certificate_arn != "" || var.create_acm) ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  # Ensure this rule has higher priority than the catch-all web rule
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.resource_server_tg.arn
  }

    condition {
      path_pattern {
        # match /resources and /resources/*
        values = ["/resources", "/resources/*"]
      }
    }
}

resource "aws_lb_listener_rule" "need_path_https" {
  count        = (var.acm_certificate_arn != "" || var.create_acm) ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  # Ensure this rule has higher priority than other rules so /need routes correctly
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.need_server_tg.arn
  }

    condition {
      path_pattern {
        # match the plural /needs route and subpaths used by the SPA
        values = ["/needs", "/needs/*"]
      }
    }
}

resource "aws_lb_listener_rule" "auth_path_https" {
  count        = (var.acm_certificate_arn != "" || var.create_acm) ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth_server_tg.arn
  }

  condition {
    path_pattern {
      # Only forward exact /auth and subpaths like /auth/* to the auth server.
      # Prevents paths like /auth-callback.html from being routed to the auth service.
      values = ["/auth", "/auth/*"]
    }
  }
}

resource "aws_lb_listener_rule" "web_path_https" {
  count        = (var.acm_certificate_arn != "" || var.create_acm) ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn

  # low priority catch-all for the SPA
  priority = 1000

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web_app_tg.arn
  }

  condition {
    path_pattern {
      values = ["/", "/*"]
    }
  }
}

/* HTTP listener now redirects all requests to HTTPS. Listener rules for forwarding
   are defined on the HTTPS listener (see resource_*_https, auth_path_https, web_path_https). */

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

resource "aws_security_group_rule" "alb_to_service_web" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
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
