// Networking scaffold: VPC, public subnets, IGW, route table, and a service security group.

resource "aws_vpc" "knapsack" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name        = "knapsack-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.knapsack.id
  tags = {
    Name = "knapsack-igw-${var.environment}"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.knapsack.id
  cidr_block              = cidrsubnet(aws_vpc.knapsack.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "knapsack-public-${count.index}-${var.environment}"
  }
}

data "aws_availability_zones" "available" {}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["137112412989"] # Amazon
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.knapsack.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

// Private subnets + NAT gateway
resource "aws_subnet" "private" {
  count                   = 2
  vpc_id                  = aws_vpc.knapsack.id
  cidr_block              = cidrsubnet(aws_vpc.knapsack.cidr_block, 8, count.index + 2)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = false
  tags = {
    Name = "knapsack-private-${count.index}-${var.environment}"
  }
}

// NAT instance (cheaper for dev): single-instance NAT
resource "aws_security_group" "nat_sg" {
  name   = "knapsack-nat-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "Security group for NAT instance"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [aws_vpc.knapsack.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "nat" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.nat_instance_type
  subnet_id                   = aws_subnet.public[0].id
  associate_public_ip_address = true
  vpc_security_group_ids      = [aws_security_group.nat_sg.id]
  source_dest_check           = false

  tags = {
    Name = "knapsack-nat-${var.environment}"
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.knapsack.id
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  network_interface_id   = aws_instance.nat.primary_network_interface_id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_security_group" "service_sg" {
  name   = "knapsack-service-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "Security group for internal services (allow egress)."

  ingress {
    description = "Allow from ALB"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "knapsack-service-sg-${var.environment}"
  }
}

output "vpc_id" {
  value = aws_vpc.knapsack.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "service_sg_id" {
  value = aws_security_group.service_sg.id
}

// VPC endpoints to allow private-subnet tasks to reach ECR and S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.knapsack.id
  service_name = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids = [for rt in [aws_route_table.private] : rt.id]

  tags = {
    Name = "knapsack-s3-endpoint-${var.environment}"
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id            = aws_vpc.knapsack.id
  service_name      = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type = "Interface"
  subnet_ids        = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.service_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "knapsack-ecr-api-endpoint-${var.environment}"
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id            = aws_vpc.knapsack.id
  service_name      = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type = "Interface"
  subnet_ids        = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.service_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "knapsack-ecr-dkr-endpoint-${var.environment}"
  }
}

output "vpc_endpoint_ids" {
  value = {
    s3      = aws_vpc_endpoint.s3.id
    ecr_api = aws_vpc_endpoint.ecr_api.id
    ecr_dkr = aws_vpc_endpoint.ecr_dkr.id
    logs    = aws_vpc_endpoint.logs.id
  }
}

// CloudWatch Logs interface endpoint so ECS tasks in private subnets can write logs
resource "aws_vpc_endpoint" "logs" {
  vpc_id            = aws_vpc.knapsack.id
  service_name      = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type = "Interface"
  subnet_ids        = aws_subnet.private[*].id
  security_group_ids = [aws_security_group.service_sg.id]
  private_dns_enabled = true

  tags = {
    Name = "knapsack-logs-endpoint-${var.environment}"
  }
}


