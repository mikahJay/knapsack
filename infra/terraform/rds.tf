// RDS Postgres for knapsack

resource "random_password" "db_master" {
  length  = 16
  special = true
}

resource "aws_db_subnet_group" "knapsack" {
  name       = "knapsack-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  tags = {
    Name = "knapsack-db-subnet-group-${var.environment}"
  }
}

resource "aws_security_group" "rds_sg" {
  name   = "knapsack-rds-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "Allow DB access from service SG"

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.service_sg.id, aws_security_group.bastion.id]
  }

  dynamic "ingress" {
    for_each = var.allowed_db_cidr_blocks
    content {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
      description = "Allowed DB access CIDR"
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "knapsack-rds-sg-${var.environment}"
  }
}

resource "aws_db_instance" "knapsack" {
  identifier             = "knapsack-${var.environment}"
  engine                 = "postgres"
  instance_class         = var.db_instance_class
  allocated_storage      = 20
  db_name                = "knapsack"
  username               = var.db_username
  password               = random_password.db_master.result
  db_subnet_group_name   = aws_db_subnet_group.knapsack.name
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  # Enable IAM DB authentication so AWS Console Query Editor can connect using IAM
  iam_database_authentication_enabled = true
  skip_final_snapshot                 = true
  publicly_accessible                 = false
  apply_immediately                   = true
  tags = {
    Name = "knapsack-db-${var.environment}"
  }
}

# Store DB credentials in Secrets Manager for services to read
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "/knapsack/${var.environment}/db/credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials_ver" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username,
    password = random_password.db_master.result
  })
}

output "db_endpoint" {
  value = aws_db_instance.knapsack.address
}

output "db_port" {
  value = aws_db_instance.knapsack.port
}

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db_credentials.arn
}
