// Bastion instance for in-VPC access via SSM (no public IP)
resource "aws_iam_role" "bastion_ssm_role" {
  name = "knapsack-bastion-ssm-${var.environment}"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "bastion_ssm_attach" {
  role       = aws_iam_role.bastion_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion_profile" {
  name = "knapsack-bastion-profile-${var.environment}"
  role = aws_iam_role.bastion_ssm_role.name
}

resource "aws_security_group" "bastion" {
  name   = "knapsack-bastion-sg-${var.environment}"
  vpc_id = aws_vpc.knapsack.id

  description = "Bastion SG for SSM-managed instances"

  # allow the instance to reach RDS and other resources
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description      = "SSH from user IPv6"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = ["2601:447:d180:5e80:9401:6370:a8e8:1e59/128"]
  }

  tags = {
    Name = "knapsack-bastion-sg-${var.environment}"
  }
}

resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public[0].id
  iam_instance_profile   = aws_iam_instance_profile.bastion_profile.name
  vpc_security_group_ids = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  tags = {
    Name = "knapsack-bastion-${var.environment}"
  }
}

output "bastion_instance_id" {
  value = aws_instance.bastion.id
  description = "Instance id of the SSM-managed bastion"
}

output "bastion_public_ip" {
  value = aws_instance.bastion.public_ip
  description = "Public IP of the bastion (for SSH)"
}
