---
description: 尚硅谷大模型技术之MySQL · 第9章 约束。
---

# 第9章 约束

## 9.1 约束的作用

约束是为了保证数据的完整性，数据完整性（Data Integrity）是指数据的精确性（Accuracy）和可靠性（Reliability）。它是应防止数据库中存在不符合语义规定的数据和防止因错误信息的输入输出造成无效操作或错误信息而提出的。

数据的完整性要从以下四个方面考虑：

* 实体完整性（Entity Integrity）：例如，同一个表中，不能存在两条完全相同无法区分的记录
* 域完整性（Domain Integrity）：例如：年龄范围0-120，性别范围“男/女”
* 引用完整性（Referential Integrity）：例如：员工所在部门，在部门表中要能找到这个部门
* 用户自定义完整性（User-defined Integrity）：例如：用户名唯一、密码不能为空等，本部门经理的工资不得高于本部门职工的平均工资的5倍。

## 9.2 约束的类型

1、约束类型

* 键约束：主键约束、外键约束、唯一键约束
* Not NULL约束：非空约束
* Check约束：检查约束
* Default约束：默认值约束

自增是键约束字段的一个额外的属性。

2、表级约束和列级约束

其中键约束和检查约束是表级约束，即不仅要看约束字段当前单元格的数据，还要看其他单元格的数据。

非空约束和默认值约束都是列级约束，即约束字段只看当前单元格的数据即可，和其他单元格无关。

所有的表级约束都可以在“information_schema.table_constraints”表中查看。

```sql
SELECT * FROM information_schema.table_constraints WHERE table_name = '表名称';
```

3、约束和索引

在MySQL中键约束会自动创建索引，提高查询效率。索引的详细讲解在高级部分。

MySQL高级会给大家讲解索引、存储引擎等，因为高级要给大家分析SQL性能。而基础阶段先不管效率，只要能查出来就行。



约束和索引不同：

约束是一个逻辑概念，它不会单独占用物理空间，

索引是一个物理概念，它是会占用物理空间。

例如：字典

字典里面有要求，不能有重复的字（字一样，读音也一样），这是约束。

字典里面有“目录”，它可以快速的查找某个字，目录需要占用单独的页。

## 9.3 非空约束

1、作用

限定某个字段/某列的值不允许为空

2、关键字：not null

3、特点

（1）只能某个列单独限定非空，不能组合非空

（2）一个表可以有很多列都分别限定了非空

4、如何指定非空约束

```sql
create table 表名称(
	字段名 数据类型 not null,
	字段名 数据类型 not null,
	字段名 数据类型
);
```

```sql
drop table if exists stu;
create table stu(
	id int not null,
	name varchar(20) not null,
	birthday date  #没有加not null的，允许为NULL
);

mysql> desc stu;
+----------+-------------+------+-----+---------+-------+
| Field    | Type        | Null | Key | Default | Extra |
+----------+-------------+------+-----+---------+-------+
| id       | int         | NO   |     | NULL    |       |
| name     | varchar(20) | NO   |     | NULL    |       |
| birthday | date        | YES  |     | NULL    |       |
+----------+-------------+------+-----+---------+-------+
3 rows in set (0.00 sec)

mysql> insert into stu values(1,'张三');
ERROR 1136 (21S01): Column count doesn't match value count at row 1'#错误，值列表数量与字段数量不匹配

insert into stu(id,name) values(1,'张三');
insert into stu(id,name,birthday) values(2,'李四','2000-1-1');
insert into stu values(3,'王五','2000-2-1');
insert into stu values(4,'赵六',null);

#给非空字段添加NULL值
mysql> insert into stu values(null,null,null);
ERROR 1048 (23000): Column 'id' cannot be null

#指定了id字段的值，但是没有指定name字段和birthday字段的值
mysql> insert into stu(id) values(1);
ERROR 1364 (HY000): Field 'name' doesn't have a default value'
#此时name设定了NOT NULL，但又没有提前指定默认值，
#如果没赋值只能处理为NULL，就违反非空约束

#总结：在insert添加记录时，必须给所有没有提前指定默认值的非空约束字段赋值。
```

## 10.4 唯一键约束

1、唯一键约束的作用

单列唯一：用来限制某个字段/某列的值不能重复。

组合唯一：用来限定几个字段的值组合不能重复。

2、关键字：unique key

3、特点

```sql
（1）一个表可以有很多个唯一键约束，
（2）每一个唯一键约束字段都会自动创建索引。
（3）唯一键约束允许为空
（4）唯一键约束也可以是复合唯一
（5）删除唯一键约束的索引来删除唯一键约束
```

4、如何指定唯一键约束

```sql
#在建表时，可以指定唯一键约束
create table 表名称(
	字段名 数据类型 unique key,
	字段名 数据类型 unique key,
	字段名 数据类型
);

create table 表名称(
	字段名 数据类型,
	字段名 数据类型,
	字段名 数据类型,
	unique key(字段名),
	unique key(字段名)
);
```

5、复合唯一

```sql
create table 表名称(
	字段名  数据类型,
    字段名  数据类型,  
    字段名  数据类型,
    unique key(字段列表) #字段列表中写的是多个字段名，多个字段名用逗号分隔，表示那么是复合唯一，即多个字段的组合是唯一的
);
```

6、示例代码1

```sql
#创建一个表格，限定编号、身份证号码和手机号码唯一
drop table if exists emp;
create table emp(
	id int unique key,  #表示id字段值不能重复
	name varchar(20),
	cardid char(18),
	tel char(11),
	unique key(cardid),  #表示cardid字段值不能重复
	unique key(tel)  #表示tel字段值不能重复
);

mysql> desc emp;
+--------+-------------+------+-----+---------+-------+
| Field  | Type        | Null | Key | Default | Extra |
+--------+-------------+------+-----+---------+-------+
| id     | int         | YES  | UNI | NULL    |       |
| name   | varchar(20) | YES  |     | NULL    |       |
| cardid | char(18)    | YES  | UNI | NULL    |       |
| tel    | char(11)    | YES  | UNI | NULL    |       |
+--------+-------------+------+-----+---------+-------+
4 rows in set (0.00 sec)


#添加数据
insert into emp values(1,'张三','25678544522222','13589587585');
insert into emp values(2,'张三','25678544522211','13589587596');

#查询数据
select * from emp;

mysql> insert into emp values(3,'李四','25678544522233','13589587596');#手机号码重复，报错
ERROR 1062 (23000): Duplicate（复制、重复） entry（输入） '13589587596' for key 'emp.tel'


insert into emp values(3,'李四',null,null),(4,'王五',null,null);

mysql> select * from emp;
+------+------+----------------+-------------+
| id   | name | cardid         | tel         |
+------+------+----------------+-------------+
|    1 | 张三 | 25678544522222 | 13589587585 |
|    2 | 张三 | 25678544522211 | 13589587596 |
|    3 | 李四 | NULL           | NULL        | #NULL可以重复
|    4 | 王五 | NULL           | NULL        |
+------+------+----------------+-------------+
4 rows in set (0.00 sec)
```

7、示例代码2

```sql
#学生表
drop table if exists stu;
create table stu(
	id int,
	name varchar(20)
);

#添加学生信息
insert into stu values(1,'张三');
insert into stu values(2,'李四');

mysql> select * from stu;
+------+------+
| id   | name |
+------+------+
|    1 | 张三 |
|    2 | 李四 |
+------+------+
2 rows in set (0.00 sec)

#课程表
drop table if exists course;
create table course(
	id int,
	title varchar(50)
);

#添加课程信息
insert into course values(1,'java');
insert into course values(2,'mysql');

mysql> select * from course;
+------+-------+
| id   | title |
+------+-------+
|    1 | java  |
|    2 | mysql |
+------+-------+
2 rows in set (0.00 sec)

#选课表
drop table if exists xuanke;
create table xuanke(
	xid int  unique key, #表示xid不能重复
	sid int,
	cid int,
	score int,
	unique key(sid,cid) #这么写表示sic和cid的组合不能重复，
						#单独看sid和cid是可以重复的
);

mysql> desc xuanke;
+-------+------+------+-----+---------+-------+
| Field | Type | Null | Key | Default | Extra |
+-------+------+------+-----+---------+-------+
| xid   | int  | YES  | UNI | NULL    |       |
| sid   | int  | YES  | MUL | NULL    |       |
| cid   | int  | YES  |     | NULL    |       |
| score | int  | YES  |     | NULL    |       |
+-------+------+------+-----+---------+-------+
4 rows in set (0.01 sec)

#添加选课成绩信息
insert into xuanke values(1,1,1,89);
insert into xuanke values(2,1,2,96);
insert into xuanke values(3,2,1,75);
insert into xuanke values(4,2,2,96);

mysql> select * from xuanke;
+------+------+------+-------+
| xid  | sid  | cid  | score |
+------+------+------+-------+
|    1 |    1 |    1 |    89 |
|    2 |    1 |    2 |    96 |
|    3 |    2 |    1 |    75 |
|    4 |    2 |    2 |    96 |
+------+------+------+-------+
4 rows in set (0.00 sec)
#单独看sid是可以重复的
#单独看cid是可以重复的
#组合看sid和cid是不可以重复的

insert into xuanke values(5,1,1,100); #sid为1和cid为1组合重复
mysql> insert into xuanke values(5,1,1,100);
ERROR 1062 (23000): Duplicate entry '1-1' for key 'xuanke.sid'
```



## 9.5 主键约束（重要）

### 9.5.1 主键约束

1、主键约束的作用

用来唯一的确定一条记录

2、关键字：primary key

3、特点

（1）唯一并且非空

（2）一个表最多只能有一个主键约束

（3）如果主键是由多列组成，可以使用复合主键

（4）主键列会自动创建索引（能够根据主键查询的，就根据主键查询，效率更高）

主键列的唯一并且非空是约束的概念，但是mysql会给每个表的主键列创建索引，会开辟单独的物理空间来存储每一个主键的目录表（Btree结构）。这样设计的意义，可以根据主键快速查询到某一行的记录。

（5）如果删除主键约束了，主键约束对应的索引就自动删除了，但是非空约束不会自动删除。

4、唯一键约束和主键约束区别

```sql
4、唯一键约束和主键约束的区别
（1）唯一键约束一个表可以有好几个，
但是主键约束只有一个
（2）唯一键约束本身不带非空限制，如果需要非空，需要单独定义。
主键约束不用再定义NOT NULL，自身就带非空限制。
```

5、如何指定主键约束

```sql
create table 表名称(
	字段名  数据类型  primary key,
    字段名  数据类型,  
    字段名  数据类型  
);
create table 表名称(
	字段名  数据类型,
    字段名  数据类型,  
    字段名  数据类型,
    primary key(字段名)
);
```

6、复合主键

```sql
create table 表名称(
	字段名  数据类型,
    字段名  数据类型,  
    字段名  数据类型,
    primary key(字段名1,字段名2)  #表示字段1和字段2的组合是唯一的，也可以有更多个字段
);
```

7、示例代码1

```sql
#演示主键约束
#创建员工表
drop table if exists emp;
create table emp(
	id int primary key,
	ename varchar(20) not null,
	cardid char(18) unique key not null, #非空并且唯一
	tel char(11) unique key, #只是唯一，可以为空
	address varchar(100) #既可以为null，又可以重复
);

#查看表结构
desc emp;

mysql> desc emp;
+---------+--------------+------+-----+---------+-------+
| Field   | Type         | Null | Key | Default | Extra |
+---------+--------------+------+-----+---------+-------+
| id      | int          | NO   | PRI | NULL    |       |
| ename   | varchar(20)  | NO   |     | NULL    |       |
| cardid  | char(18)     | NO   | UNI | NULL    |       |
| tel     | char(11)     | YES  | UNI | NULL    |       |
| address | varchar(100) | YES  |     | NULL    |       |
+---------+--------------+------+-----+---------+-------+
5 rows in set (0.01 sec)

#添加数据
insert into emp 
values(1,'张三','524265198235684255','18536955456',null);

#添加数据
insert into emp 
values(2,'李四','524265198235685255',null,null);#tel可以为null

mysql> select * from emp;
+----+-------+--------------------+-------------+---------+
| id | ename | cardid             | tel         | address |
+----+-------+--------------------+-------------+---------+
|  1 | 张三  | 524265198235684255 | 18536955456 | NULL    |
|  2 | 李四  | 524265198235685255 | NULL        | NULL    |
+----+-------+--------------------+-------------+---------+
2 rows in set (0.00 sec)

#添加数据
insert into emp 
values(3,'李四','524265198235685895',null,null);

#添加数据
insert into emp 
values(3,'王五','524265198235675895',null,null);#主键重复

mysql> #添加数据
mysql> insert into emp
    -> values(3,'王五','524265198235675895',null,null);#主键重复
ERROR 1062 (23000): Duplicate entry '3' for key 'emp.PRIMARY'


#添加数据
insert into emp 
values(null,'王五','524265198235675775',null,null);#主键为null

mysql> insert into emp
    -> values(null,'王五','524265198235675775',null,null);#主键为null
ERROR 1048 (23000): Column 'id' cannot be null
```

8、示例代码2

```sql
#组合主键约束
#学生表
drop table if exists stu;
create table stu(
	id int,
	name varchar(20)
);

#添加学生信息
insert into stu values(1,'张三');
insert into stu values(2,'李四');

mysql> select * from stu;
+------+------+
| id   | name |
+------+------+
|    1 | 张三 |
|    2 | 李四 |
+------+------+
2 rows in set (0.00 sec)

#课程表
drop table if exists course;
create table course(
	id int,
	title varchar(50)
);

#添加课程信息
insert into course values(1,'java');
insert into course values(2,'mysql');

mysql> select * from course;
+------+-------+
| id   | title |
+------+-------+
|    1 | java  |
|    2 | mysql |
+------+-------+
2 rows in set (0.00 sec)
    
#创建一个表，两个字段设置主键
drop table if exists xuanke;
create table xuanke(
	sid int primary key,
	cid int primary key,
	score int
);

mysql> create table xuanke(
    ->  sid int primary key,  #定义两个主键，不是复合主键的意思
    ->  cid int primary key,  #定义两个主键，不是复合主键的意思
    ->  score int
    ->
    -> );
ERROR 1068 (42000): Multiple primary key defined

#定义选课表
drop table if exists xuanke;
create table xuanke(
	sid int,
	cid int,
	score int,
	primary key(sid,cid)  #组合/复合主键
);

mysql> desc xuanke;
+-------+------+------+-----+---------+-------+
| Field | Type | Null | Key | Default | Extra |
+-------+------+------+-----+---------+-------+
| sid   | int  | NO   | PRI | NULL    |       |
| cid   | int  | NO   | PRI | NULL    |       |
| score | int  | YES  |     | NULL    |       |
+-------+------+------+-----+---------+-------+
3 rows in set (0.01 sec)

insert into xuanke values(1,1,96),(2,1,85),(1,2,75),(2,2,45);

#添加重复主键报错
insert into xuanke values(1,1,75);
mysql> insert into xuanke values(1,1,75);
ERROR 1062 (23000): Duplicate entry '1-1' for key 'xuanke.PRIMARY'
```

### 9.5.2 三大范式

1、第一范式（1NF）

原子性：强调的是列的原子性，即数据库中每一列的字段都是单一属性，不可再分的。并且这个单一属性必须是由基本的数据类型所构成的，如整数、字符串等。例如：这是一张员工表：

| 员工ID | 姓名   | 性别 | 部门   | 联系电话           |
| ------ | ------ | ---- | ------ | ------------------ |
| 101    | 周星星 | 女   | 销售部 | 15015246623,663323 |
| 102    | 张三   | 男   | 市场部 | 18515246623,995638 |

合理：

| 员工ID | 姓名   | 性别 | 部门   | 手机号码    | 家庭电话 |
| ------ | ------ | ---- | ------ | ----------- | -------- |
| 101    | 周星星 | 女   | 销售部 | 15015246623 | 663323   |
| 102    | 张三   | 男   | 市场部 | 18515246623 | 995638   |

2、第二范式（2NF）

依赖性：在满足1NF的基础上再要求：

- 一张表必须有一个主键；
- 非主键列必须完全依赖于主键，而不能只依赖主键的一部分。

例如：学生成绩表

| 学号 | 学生姓名 | 课程编号 | 课程名 | 成绩 | 学生联系电话 |
| ---- | -------- | -------- | ------ | ---- | ------------ |
| 1    | 张三     | 1        | Java   | 100  | 15015246623  |
| 2    | 李四     | 1        | Java   | 98   | 18515246623  |
| 1    | 张三     | 2        | MySQL  | 86   | 15015246623  |

上述表如果要设置主键，需要设置复合主键。(学号，课程编号)

合理的设计：

学生表：

| 学号 | 学生姓名 | 学生联系电话 |
| ---- | -------- | ------------ |
| 1    | 张三     | 15015246623  |
| 2    | 李四     | 18515246623  |

课程表：

| 课程编号 | 课程名 |
| -------- | ------ |
| 1        | Java   |
| 1        | Java   |

成绩表：

| 学号 | 课程编号 | 成绩 |
| ---- | -------- | ---- |
| 1    | 1        | 100  |
| 2    | 1        | 98   |

3、第三范式（3NF）

在满足2NF的基础上，另外再满足一个条件：非主键列必须直接依赖于主键，不能存在传递依赖，即非主键列不能依赖于非主键列。例如：这是一张课表：

| 课程编号 | 课程名称       | 上课时间 | 任课老师 | 老师电话    | 老师职位 |
| -------- | -------------- | -------- | -------- | ----------- | -------- |
| 101      | 马克思理论基础 | 8:00     | Lily     | 18016253155 | 讲师     |
| 102      | 经济学         | 14:00    | Lucy     | 18055231233 | 教授     |

正确的：

课程表：

| 课程编号 | 课程名称       | 上课时间 | 任课老师 |
| -------- | -------------- | -------- | -------- |
| 101      | 马克思理论基础 | 8:00     | Lily     |
| 102      | 经济学         | 14:00    | Lucy     |

教师表：

| 姓名 | 电话        | 职位 |
| ---- | ----------- | ---- |
| Lily | 18016253155 | 讲师 |
| Lucy | 18055231233 | 教授 |



## 9.6 默认值约束

1、作用

给某个字段/某列指定默认值，当添加时或修改时，可以使用默认值。

2、关键字：default

3、如何给字段加默认值

```sql
create table 表名称(
	字段名  数据类型  primary key,
    字段名  数据类型  【unique key】 【not null】,  
    字段名  数据类型  【not null】 【default 默认值】 
);
```

```sql
#演示默认值约束
#建表时，可以在字段后面给字段指定默认值
drop table if exists emp;
create table emp(
	eid int primary key,
	ename varchar(20) not null,
	gender enum('男','女') default '男' not null, #非空并且有默认值
	address varchar(100) default '不详'
);

#查看表结构
desc emp;
mysql> desc emp;
+---------+-----------------+------+-----+---------+-------+
| Field   | Type            | Null | Key | Default | Extra |
+---------+-----------------+------+-----+---------+-------+
| eid     | int             | NO   | PRI | NULL    |       |
| ename   | varchar(20)     | NO   |     | NULL    |       |
| gender  | enum('男','女') | NO   |     | 男      |       |
| address | varchar(100)    | YES  |     | 不详    |       |
+---------+-----------------+------+-----+---------+-------+
4 rows in set (0.01 sec)

mysql> insert into emp values(1,'张三');
ERROR 1136 (21S01): Column count doesn't match value count at row 1'#错误，值的数量和字段的数量不匹配

insert into emp(eid,ename) values(1,'张三');
insert into emp values(2,'李四',default,default);
insert into emp values(3,'王五',default,null);
insert into emp values(4,'翠花','女','北京');

mysql> select * from emp;
+-----+-------+--------+---------+
| eid | ename | gender | address |
+-----+-------+--------+---------+
|   1 | 张三  | 男     | 不详    |
|   2 | 李四  | 男     | 不详    |
|   3 | 王五  | 男     | NULL    |
|   4 | 翠花  | 女     | 北京    |
+-----+-------+--------+---------+
4 rows in set (0.00 sec)
```



## 9.7 自增属性

1、作用

作用：给某个字段自动赋值，这个值是一直往上增加，如果没有特意干扰的，每次自增1.

2、关键字：auto_increment

3、特点和要求

```sql
（1）一个表只能有一个自增字段，因为一个表只有一个AUTO_INCREMENT属性记录自增字段值
（2）并且自增字段只能是key字段，即定义了主键、唯一键等键约束的字段。
一般都是给主键和唯一键加自增。
（3）自增字段应该是数值类型，一般都是整数类型。
（4）如果自增列指定了 0 和 null，会在当前最大值的基础上自增，
如果自增列手动指定了具体值，直接赋值为具体值。
（5）如果手动修改AUTO_INCREMENT属性值， 必须 > 当前自增字段的最大值
```

4、如何指定自增

```sql
create table 表名称(
	字段名  数据类型  primary key auto_increment,
    字段名  数据类型  【unique key】 【not null】,  
    字段名  数据类型  【not null】 【default 默认值】 
);
```

5、查看下一个自增值

```sql
SELECT AUTO_INCREMENT
FROM information_schema.tables
WHERE table_name = '表名称'
AND table_schema = '数据库名';
```

6、示例代码

```sql
#演示自增属性
#创建表
drop table if exists emp;
create table emp(
	eid int auto_increment,
	ename varchar(20)
);

mysql> create table emp(
    ->  eid int auto_increment,
    ->  ename varchar(20)
    -> );
ERROR 1075 (42000): Incorrect table definition; 
there can be only one auto column and it must be defined as a key
    
create table emp(
	eid int primary key,
    ename varchar(20) unique key auto_increment
);
ERROR 1063 (42000): Incorrect column specifier for column 'ename'  因为ename不是整数类型

drop table if exists emp;
create table emp(
	eid int primary key auto_increment,
	ename varchar(20)
);

mysql> desc emp;
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| eid   | int         | NO   | PRI | NULL    | auto_increment |
| ename | varchar(20) | YES  |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
2 rows in set (0.00 sec)

#添加数据
insert into emp(ename) values('李四');#不给自增字段指定值，也是自增
insert into emp values(null,'张三'); #给自增字段赋值NULL，也是自增

mysql> select * from emp;
+-----+-------+
| eid | ename |
+-----+-------+
|   1 | 李四  |
|   2 | 张三  |
+-----+-------+
2 rows in set (0.00 sec)

insert into emp values(0,'王五'); #给自增字段赋值0，也是自增

mysql> select * from emp;
+-----+-------+
| eid | ename |
+-----+-------+
|   1 | 李四  |
|   2 | 张三  |
|   3 | 王五  |
+-----+-------+
3 rows in set (0.00 sec)


insert into emp values(-5,'王五'); #给自增字段赋值-5（<3)

mysql> select * from emp;
+-----+-------+
| eid | ename |
+-----+-------+
|  -5 | 王五  |
|   1 | 李四  |
|   2 | 张三  |
|   3 | 王五  |
+-----+-------+
4 rows in set (0.00 sec)

insert into emp values(null,'赵六');

mysql> select * from emp;
+-----+-------+
| eid | ename |
+-----+-------+
|  -5 | 王五  |
|   1 | 李四  |
|   2 | 张三  |
|   3 | 王五  |
|   4 | 赵六  |
+-----+-------+
5 rows in set (0.00 sec)

#建议大家实际开发中，不要随意修改“AUTO_INCREMENT”的值，让他自动维护。
```

## 9.8 检查约束

1、作用

检查（CHECK） 约束用于限制字段中的值的范围。如果对单个字段定义 CHECK 约束，那么该字段只允许特定范围的值。如果对一个表定义 CHECK 约束，那么此约束会基于行中其他字段的值在特定的字段中对值进行限制。

在MySQL 8.0.16版本之前， CREATE TABLE语句支持给单个字段定义CHECK约束的语法，但是不起作用。

2、关键字：check

例如MySQL8.0之前，就算给表定义了检查约束，也不起作用。在MySQL8.0.16版本之后，CREATE TABLE语句既支持给单个字段定义列级CHECK约束的语法，还支持定义表级CHECK约束的语法。

3、如何定义检查约束

```sql
#在建表时，可以指定检查约束
create table 表名称(
	字段名1 数据类型 check(条件) 【enforced】,  #在字段后面直接加检查约束
	字段名2 数据类型,
	字段名3 数据类型,
	check (条件)  【enforced】#可以限定两个字段之间的取值条件
);
```

如果省略或指定为ENFORCED，则会创建检查约束并强制执行约束，不满足约束的数据行不能插入成功。

如果写的是not ENFORCED，则不满足检查约束也没关系。

```sql
#演示检查约束
#创建表格，限定age>=18
drop table if exists emp;
create table emp(
	id int primary key auto_increment,
	name varchar(20) not null,
	age int check(age>=18)
);

#mysql5.7上面运行
insert into emp values(null,'张三',8);

mysql> select * from emp;
+----+------+------+
| id | name | age  |
+----+------+------+
|  1 | 张三 |    8 | #mysql5.7检查约束没有起作用
+----+------+------+
1 row in set (0.00 sec)

#mysql8.0.26上面运行
mysql> insert into emp values(null,'张三',8);
ERROR 3819 (HY000): Check constraint 'emp_chk_1' is violated.


drop table if exists emp;
create table emp(
	id int primary key auto_increment,
	name varchar(20) not null,
	age int check(age>=18), #列级约束
	birthday date not null, #出生日期
	hiredate date not null, #入职日期
	check( year(hiredate)-year(birthday)>=18)  #year(hiredate)表示取出入职日期的年份值
);

#添加数据
insert into emp values(null,'张三',23,'2000-1-1','2021-11-30');#满足条件

mysql> select * from emp;
+----+------+------+------------+------------+
| id | name | age  | birthday   | hiredate   |
+----+------+------+------------+------------+
|  1 | 张三 |   23 | 2000-01-01 | 2021-11-30 |
+----+------+------+------------+------------+
1 row in set (0.00 sec)

#添加数据
insert into emp values(null,'张三',8,'2013-1-1','2021-11-30');#不满足条件

mysql> insert into emp values(null,'张三',8,'2013-1-1','2021-11-30');
ERROR 3819 (HY000): Check constraint 'emp_chk_1' is violated.

insert into emp values(null,'张三',28,'2013-1-1','2021-11-30');#不满足条件
mysql> insert into emp values(null,'张三',28,'2013-1-1','2021-11-30');#不满足条件
ERROR 3819 (HY000): Check constraint 'emp_chk_2' is violated.
```



## 9.9 外键约束（了解）

外键约束会影响性能，效率，所以很多人不愿意加外键约束。

```txt
学生问题：
（1）如果两个表之间有关系（一对一、一对多），比如：员工表和部门表（一对多），它们之间是否一定要建外键约束？
答：不是的

（2）建和不建外键约束有什么区别？
答：
建外键约束，你的操作（创建表、删除表、添加、修改、删除）会受到限制，从语法层面受到限制。例如：在员工表中不可能添加一个员工信息，它的部门的值在部门表中找不到。
不建外键约束，你的操作（创建表、删除表、添加、修改、删除）不受限制，要保证数据的引用完整性，只能依靠程序员的自觉，或者是在Java程序中进行限定。例如：在员工表中，可以添加一个员工的信息，它的部门指定为一个完全不存在的部门。

（3）那么建和不建外键约束和查询有没有关系？
答：没有
```

1、作用

限定某个表的某个字段的引用完整性，

比如：员工表的员工所在部门的选择，必须在部门表能找到对应的部分。

2、关键字：foreign key

3、主表和从表/父表和子表

- 主表（父表）：被引用的表，被参考的表

- 从表（子表）：引用别人的表，参考别人的表


例如：员工表的员工所在部门这个字段的值要参考部门表，

​		部门表是主表，员工表是从表。

例如：学生表、课程表、选课表

​		选课表的学生和课程要分别参考学生表和课程表，

​		学生表和课程表是主表，选课表是从表。

4、特点

（1）在“从表”中指定外键约束，并且一个表可以建立多个外键约束

（2）创建(create)表时就指定外键约束的话，先创建主表，再创建从表

（3）删表时，先删从表（或先删除外键约束），再删除主表。或者先解除关系，再各自删除。

（4）从表的外键列，必须引用/参考主表的键列（主键或唯一键）

​			 为什么？因为被依赖/被参考的值必须是唯一的

（5）从表的外键列的数据类型，要与主表被参考/被引用的列的数据类型一致，并且逻辑意义一致。

​				例如：都是表示部门编号，都是int类型。

（6）外键列也会自动建立索引（根据外键查询效率很高，很多）

（7）外键约束的删除，所以不会自动删除索引，如果要删除对应的索引，必须手动删除

5、如何指定外键约束

```sql
create table 主表名称(
	字段1  数据类型  primary key,
    字段2  数据类型
);

create table 从表名称(
	字段1  数据类型  primary key,
    字段2  数据类型,
    foreign key （从表的某个字段) references 主表名(被参考字段) 【on update xxx】【on delete xxx】
);
#(从表的某个字段)的数据类型必须与主表名(被参考字段)的数据类型一致，逻辑意义也一样
#(从表的某个字段)的字段名可以与主表名(被参考字段)的字段名一样，也可以不一样
```

6、设置外键约束等级

* Cascade方式：在父表上update/delete记录时，同步update/delete掉子表的匹配记录 

* Set null方式：在父表上update/delete记录时，将子表上匹配记录的列设为null，但是要注意子表的外键列不能为not null  

* No action方式：如果子表中有匹配的记录,则不允许对父表对应候选键进行update/delete操作  

* Restrict方式：同no action, 都是立即检查外键约束

* Set default方式（在可视化工具SQLyog中可能显示空白）：父表有变更时,子表将外键列设置成一个默认的值，但Innodb不能识别

如果没有指定等级，就相当于Restrict方式。

7、示例代码1

```sql
#演示外键约束
#建表时，指定外键约束
drop table if exists dept;
create table dept(
	did int primary key auto_increment,
	dname varchar(50) unique key not null
);

drop table if exists emp;
create table emp(
	id int primary key auto_increment,
	name varchar(20) not null,
	departmentid int,  #子表中外键约束的字段名和父表的被引用字段名不要求一致，但是数据类型和逻辑意义要一样
	#外键约束只能在字段列表下面单独定义，不能在字段后面直接定义
	foreign key (departmentid) references dept(did)
);

#查看表结构
desc dept;
desc emp;

mysql> desc dept;
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| did   | int         | NO   | PRI | NULL    | auto_increment |
| dname | varchar(50) | NO   | UNI | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
2 rows in set (0.01 sec)

mysql> desc emp;
+--------------+-------------+------+-----+---------+----------------+
| Field        | Type        | Null | Key | Default | Extra          |
+--------------+-------------+------+-----+---------+----------------+
| id           | int         | NO   | PRI | NULL    | auto_increment |
| name         | varchar(20) | NO   |     | NULL    |                |
| departmentid | int         | YES  | MUL | NULL    |                |
+--------------+-------------+------+-----+---------+----------------+
3 rows in set (0.00 sec)

#添加记录
#添加父表信息，没有影响
insert into dept values(null,'财务'),(null,'教学'),(null,'咨询'),(null,'后勤');

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   4 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
|   1 | 财务  |
+-----+-------+
4 rows in set (0.00 sec)

#添加子表信息，有影响，受到约束
insert into emp values(null,'张三',1);#成功
insert into emp values(null,'李四',1);#成功
insert into emp values(null,'王五',2);#成功
insert into emp values(null,'赵六',6); #失败
#因为departmentid=1或2，在父表dept中可以找到对应记录
#因为departmentid=6，在父表dept中找不到对应记录

mysql> insert into emp values(null,'赵六',6);
ERROR 1452 (23000): Cannot add（添加） or update（修改） a child(子表） row（记录/行）:
 a foreign key constraint fails 
 (`atguigu`.`emp`, CONSTRAINT `emp_ibfk_1` FOREIGN KEY (`departmentid`) REFERENCES `dept` (`did`))

mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |            1 |
|  2 | 李四 |            1 |
|  3 | 王五 |            2 |
+----+------+--------------+
3 rows in set (0.00 sec)


#修改子表的外键字段的信息，有影响，受到约束
update emp set departmentid = 3 where id = 1;#成功
#因为departmentid = 3在父表dept中可以找到对应部门

update emp set departmentid = 6 where id = 3; #失败  
#因为departmentid = 6在父表dept中找不到对应部门

mysql> update emp set departmentid = 6 where id = 3;
ERROR 1452 (23000): Cannot add or update a child row: 
a foreign key constraint fails (`atguigu`.`emp`, CONSTRAINT `emp_ibfk_1` FOREIGN KEY (`departmentid`) REFERENCES `dept` (`did`))


mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |            3 |
|  2 | 李四 |            1 |
|  3 | 王五 |            2 |
+----+------+--------------+
3 rows in set (0.00 sec)

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   4 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
|   1 | 财务  |
+-----+-------+
4 rows in set (0.00 sec)


#修改父表的被引用字段的值，受约束
update dept set did = 6 where did = 1;#失败
#因为did=1的部门被子表引用
update dept set did = 6 where did = 4;#成功
#因为 did=4的部门没有被子表引用

mysql> update dept set did = 6 where did = 1;
ERROR 1451 (23000): Cannot delete（删除） or update（修改） a parent（父表） row（记录/行）:
 a foreign key constraint fails 
 (`atguigu`.`emp`, CONSTRAINT `emp_ibfk_1` FOREIGN KEY (`departmentid`) REFERENCES `dept` (`did`))


mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   6 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
|   1 | 财务  |
+-----+-------+
4 rows in set (0.00 sec)

#删除父表的记录，受约束
delete from dept where did = 6; #成功
#因为 did=6的部门没有被子表引用

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   3 | 咨询  |
|   2 | 教学  |
|   1 | 财务  |
+-----+-------+
3 rows in set (0.00 sec)

#删除父表的记录，受约束
delete from dept where did = 1; #失败
#因为 did=1的部门被子表引用

mysql> delete from dept where did = 1;
ERROR 1451 (23000): Cannot delete or update a parent row:
 a foreign key constraint fails (`atguigu`.`emp`, CONSTRAINT `emp_ibfk_1` FOREIGN KEY (`departmentid`) REFERENCES `dept` (`did`))

#删除子表的数据，不受约束
delete from emp where name ='王五'; #可以

mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |            3 |
|  2 | 李四 |            1 |
+----+------+--------------+
2 rows in set (0.00 sec)


#删除父表，受约束
drop table dept; #失败

mysql> drop table dept; #失败
ERROR 3730 (HY000): Cannot drop table 'dept' referenced by a foreign key constraint 'emp_ibfk_1' on table 'emp'.

#删除子表，不受约束
drop table emp;
```



8、示例代码2

（1）失败：不是键列

```sql
create table dept(
	did int ,		#部门编号
    dname varchar(50)			#部门名称
);

create table emp(
	eid int primary key,  #员工编号
    ename varchar(5),     #员工姓名
    deptid int,				#员工所在的部门
    foreign key (deptid) references dept(did)
);ERROR 1215 (HY000): Cannot add foreign key constraint  原因是dept的did不是键列
```

（2）失败：数据类型不一致

```sql
create table dept(
	did int primary key,		#部门编号
    dname varchar(50)			#部门名称
);

create table emp(
	eid int primary key,  #员工编号
    ename varchar(5),     #员工姓名
    deptid char,				#员工所在的部门
    foreign key (deptid) references dept(did)
);ERROR 1215 (HY000): Cannot add foreign key constraint  原因是从表的deptid字段和主表的did字段的数据类型不一致，并且要它俩的逻辑意义一致
```



9、示例代码3

```sql
#父表
create table dept(
	did int primary key auto_increment,
	dname varchar(50) unique key not null
);

insert into dept values(null,'财务'),(null,'教学'),(null,'咨询'),(null,'后勤');

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   4 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
|   1 | 财务  |
+-----+-------+
4 rows in set (0.00 sec)

#子表
create table emp(
	id int primary key auto_increment,
	name varchar(20) not null,
	departmentid int,
	foreign key (departmentid) references dept(did) on update cascade on delete set null
	#on delete set null要求departmentid字段没有not null约束
);

#添加子表时记录和  定义on update cascade on delete set null无关。还是要在主表能找到对应的记录。
insert into emp values(null,'张三',1);
insert into emp values(null,'李四',2);
insert into emp values(null,'王五',1);

mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |            1 |
|  2 | 李四 |            2 |
|  3 | 王五 |            1 |
+----+------+--------------+
3 rows in set (0.00 sec)

#修改子表， 和  定义on update cascade on delete set null无关。还是要在主表能找到对应的记录。
update emp set departmentid = 6 where name = '王五';
#失败，因为departmentid = 6在父表dept中找不到对应部门

#修改父表被引用的did值， 和  定义on update cascade on delete set null有关。
update dept set did = 6 where did = 1; 
#此时did=1的记录被子表引用了，可以修改，并且会同时修改子表的departmentid=1的字段值为6，级联修改

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   4 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
|   6 | 财务  |
+-----+-------+
4 rows in set (0.00 sec)

mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |            6 |
|  2 | 李四 |            2 |
|  3 | 王五 |            6 |
+----+------+--------------+
3 rows in set (0.00 sec)

#删除父表dept被引用的did的记录， 和  定义on update cascade on delete set null有关。
delete from dept where did = 6; #did=6的部门在子表中有引用

mysql> select * from dept;
+-----+-------+
| did | dname |
+-----+-------+
|   4 | 后勤  |
|   3 | 咨询  |
|   2 | 教学  |
+-----+-------+
3 rows in set (0.00 sec)

mysql> select * from emp;
+----+------+--------------+
| id | name | departmentid |
+----+------+--------------+
|  1 | 张三 |         NULL |
|  2 | 李四 |            2 |
|  3 | 王五 |         NULL |
+----+------+--------------+
3 rows in set (0.00 sec)
```
