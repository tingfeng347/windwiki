---
description: 尚硅谷大模型技术之MySQL · 第10章 修改表结构和约束。
---

# 第10章 修改表结构和约束

## 10.1 修改表结构

```sql
drop table if exists teacher;
create table teacher(
	tid int,
    tname varchar(5),
    salary double,
    weight double(5,2),
    birthday date,
    gender enum('男','女'),
    blood enum('A','B','AB','O'),
	tel char(11)
);
```

1、修改表名称：重命名表

```sql
alter table 旧表名 rename 【to】 新表名;
rename table 旧表名称 to 新表名称;
```

例如：

```sql
alter table teacher rename to t_tea;
rename table t_tea to teacher;
```

2、修改表结构：删除字段

```sql
alter table 表名称 drop 【column】 字段名称; 
```

```sql
alter table teacher drop column weight;
```

3、修改表结构：增加字段

```sql
alter table 表名称 add 【column】 字段名称 数据类型; 
alter table 表名称 add 【column】 字段名称 数据类型 first;
alter table 表名称 add 【column】 字段名称 数据类型 after 另一个字段;
```

例如：

```sql
alter table teacher add weight double(5,2);
alter table teacher drop column weight;

alter table teacher add weight double(5,2) first;
alter table teacher drop column weight;

alter table teacher add weight double(5,2) after salary;
alter table teacher drop column weight;
```

4、修改表结构：修改字段的名称

```sql
alter table 表名称 change 【column】 旧字段名称 新的字段名称 新的数据类型; 
```

例如：

```sql
mysql> desc teacher;
+----------+------------------------+------+-----+---------+-------+
| Field    | Type                   | Null | Key | Default | Extra |
+----------+------------------------+------+-----+---------+-------+
| tid      | int(11)                | YES  |     | NULL    |       |
| tname    | varchar(5)             | YES  |     | NULL    |       |
| salary   | double                 | YES  |     | NULL    |       |
| weight   | double                 | YES  |     | NULL    |       |
| birthday | date                   | YES  |     | NULL    |       |
| gender   | enum('男','女')        | YES  |     | NULL    |       |
| blood    | enum('A','B','AB','O') | YES  |     | NULL    |       |
| tel      | char(11)               | YES  |     | NULL    |       |
+----------+------------------------+------+-----+---------+-------+
8 rows in set (0.00 sec)

mysql> alter table teacher change tel phone char(11);
Query OK, 0 rows affected (0.01 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc teacher;
+----------+------------------------+------+-----+---------+-------+
| Field    | Type                   | Null | Key | Default | Extra |
+----------+------------------------+------+-----+---------+-------+
| tid      | int(11)                | YES  |     | NULL    |       |
| tname    | varchar(5)             | YES  |     | NULL    |       |
| salary   | double                 | YES  |     | NULL    |       |
| weight   | double                 | YES  |     | NULL    |       |
| birthday | date                   | YES  |     | NULL    |       |
| gender   | enum('男','女')        | YES  |     | NULL    |       |
| blood    | enum('A','B','AB','O') | YES  |     | NULL    |       |
| phone    | char(11)               | YES  |     | NULL    |       |
+----------+------------------------+------+-----+---------+-------+
8 rows in set (0.00 sec)
```

5、修改表结构：修改字段的数据类型等

```sql
alter table 表名称 modify 【column】 字段名称 新的数据类型; 
alter table 表名称 modify 【column】 字段名称 数据类型 first;
alter table 表名称 modify 【column】 字段名称 数据类型 after 另一个字段;
```

例如：

```sql
mysql> desc teacher;
+----------+------------------------+------+-----+---------+-------+
| Field    | Type                   | Null | Key | Default | Extra |
+----------+------------------------+------+-----+---------+-------+
| tid      | int(11)                | YES  |     | NULL    |       |
| tname    | varchar(5)             | YES  |     | NULL    |       |
| salary   | double                 | YES  |     | NULL    |       |
| weight   | double(5,2)            | YES  |     | NULL    |       |
| birthday | date                   | YES  |     | NULL    |       |
| gender   | enum('男','女')        | YES  |     | NULL    |       |
| blood    | enum('A','B','AB','O') | YES  |     | NULL    |       |
| tel      | char(11)               | YES  |     | NULL    |       |
+----------+------------------------+------+-----+---------+-------+
8 rows in set (0.00 sec)

mysql> alter table teacher modify column weight double;
Query OK, 0 rows affected (0.01 sec)
Records: 0  Duplicates: 0  Warnings: 0

mysql> desc teacher;
+----------+------------------------+------+-----+---------+-------+
| Field    | Type                   | Null | Key | Default | Extra |
+----------+------------------------+------+-----+---------+-------+
| tid      | int(11)                | YES  |     | NULL    |       |
| tname    | varchar(5)             | YES  |     | NULL    |       |
| salary   | double                 | YES  |     | NULL    |       |
| weight   | double                 | YES  |     | NULL    |       |
| birthday | date                   | YES  |     | NULL    |       |
| gender   | enum('男','女')        | YES  |     | NULL    |       |
| blood    | enum('A','B','AB','O') | YES  |     | NULL    |       |
| tel      | char(11)               | YES  |     | NULL    |       |
+----------+------------------------+------+-----+---------+-------+
8 rows in set (0.00 sec)
```

## 10.2 修改约束

```sql
drop table if exists teacher;
create table teacher(
	tid int,
    tname varchar(5),
    cardid char(18),
    gender enum ('男','女'),
	age int
);
```

1、增加或删除主键

```sql
alter table 表名称 add primary key(字段名);
alter table 表名称 add primary key(字段列表);#复合主键
alter table 表名称 drop primary key;
```

例如：

```sql
desc teacher;

alter table teacher add primary key(tid);

desc teacher;

alter table teacher drop primary key;

desc teacher;
```

2、增加或删除唯一键

```sql
#如何在建表后添加唯一键约束
alter table 表名称 add unique 【key】(字段名);
alter table 表名称 add unique 【key】(字段列表);#复合唯一键
```

```sql
alter table 表名称 drop index 索引名;
#删除唯一键约束需要手动删除对应的索引
```

```sql
show index from 表名称;
SELECT * FROM information_schema.table_constraints WHERE table_name = '表名称';
```

例如：

```sql
alter table teacher add unique key (cardid);
```

```sql
alter table teacher drop index cardid;
```



3、修改表结构：修改非空、默认值约束、自增

```sql
alter table 表名称 modify 【column】 字段名称 新的数据类型 【not null】 【default 默认值】 【auto_increment】;
```

```sql
alter table teacher modify column tid int auto_increment;#键列才能加自增
alter table teacher modify column tname varchar(5) not null;
alter table teacher modify column gender enum ('男','女') not null default '男';
```



4、增加或删除检查约束

```sql
#如何在建表后添加检查约束，使用add check
alter table 表名称 add check(条件);
```

```sql
alter table 表名称 drop check 检查约束名;
```

```sql
SELECT * FROM information_schema.table_constraints WHERE table_name = '表名称';
```

例如：

```sql
alter table teacher add check(age>=18);

SELECT * FROM information_schema.table_constraints WHERE table_name = 'teacher';

alter table teacher drop check teacher_chk_1;
```

5、增加或删除外键约束

```sql
alter table 从表名称 add foreign key (从表的字段) references 主表（被引用字段) 【on update xx】【on delete xx】;
```

删除外键约束，不会自动删除外键约束列的索引，需要单独删除。

```sql
(1)第一步先查看约束名和删除外键约束
show create table 从表名称; #可以看到外键约束名
SELECT * FROM information_schema.table_constraints WHERE table_name = '表名称';#查看某个表的约束名

alter table 从表名 drop foreign key 外键约束名;

（2）第二步查看索引名和删除索引
show index from 表名称; #查看某个表的索引名

alter table 从表名 drop index 索引名;
```

```sql
drop table if exists dept;
create table dept(
	did int primary key auto_increment,
	dname varchar(50) unique key not null
);

drop table if exists emp;
create table emp(
	id int primary key auto_increment,
	name varchar(20) not null,
	departmentid int
);

alter table emp add foreign key (departmentid) references dept(did) on update cascade on delete restrict;

SELECT * FROM information_schema.table_constraints WHERE table_name = 'emp';

alter table emp drop foreign key emp_ibfk_1;

show index from emp;

alter table emp drop index departmentid;
```
