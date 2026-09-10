---
description: 尚硅谷大模型技术之MySQL · 第5章 DML。
---

# 第5章 DML

## 5.1 添加语句

（1）添加一条记录到某个表中

```sql
insert into 表名称 values(值列表); #值列表中的值的顺序、类型、个数必须与表结构一一对应
```

（2）添加一条记录到某个表中

```sql
insert into 表名称 (字段列表) values(值列表); #值列表中的值的顺序、类型、个数必须与(字段列表)一一对应
```

（3）添加多条记录到某个表中

```sql
insert into 表名称 values(值列表),(值列表),(值列表); #值列表中的值的顺序、类型、个数必须与表结构一一对应
```

```sql
insert into 表名称 (字段列表) values(值列表),(值列表),(值列表); #值列表中的值的顺序、类型、个数必须与(字段列表)一一对应
```

（4）示例演示

```sql
#演示基本的，简单的DML语句
#基于tempdb数据库演示
create database tempdb;
use tempdb;

#创建teacher表
create table teacher(
	id int,
	name varchar(20),
	gender enum('m','f'),
	birthday date,
	salary double,
	tel varchar(11)
);

#查看teacher表结构
mysql> desc teacher;
+----------+---------------+------+-----+---------+-------+
| Field    | Type          | Null | Key | Default | Extra |
+----------+---------------+------+-----+---------+-------+
| id       | int           | YES  |     | NULL    |       |
| name     | varchar(20)   | YES  |     | NULL    |       |
| gender   | enum('m','f') | YES  |     | NULL    |       |
| birthday | date          | YES  |     | NULL    |       |
| salary   | double        | YES  |     | NULL    |       |
| tel      | char(18)      | YES  |     | NULL    |       |
+----------+---------------+------+-----+---------+-------+
6 rows in set (0.01 sec)


#添加数据
#（1）第一种情况，给所有字段赋值
insert into 表名称 values(值列表);  
#这种情况要求(值列表)的每一个值的类型、顺序与表结构一一对应
#表中有几个字段，(值列表)必须有几个值，不能多也不能少
#值如果是字符串或日期类型，需要加单引号

#例如：添加一条记录到teacher表
insert into teacher values
(1,'张三','m','1998-7-8',15000.0,'18256953685');

#例如：添加一条记录到teacher表
insert into teacher values
(2,'李四','f','1998-7-8',15000.0); #少了电话号码

mysql> insert into teacher values
    -> (2,'李四','f','1998-7-8',15000.0);
ERROR 1136 (21S01): Column count doesn't match value count at row 1'
#(值列表)中值的数量和表结构中column列的数量不一致。

#例如：添加一条记录到teacher表
insert into teacher values
(2,'李四','f','北京宏福苑',15000.0,'18256953685'); #把生日写称为地址

mysql> insert into teacher values
    -> (2,'李四','f','北京宏福苑',15000.0,'18256953685');
ERROR 1292 (22007): Incorrect date value: '北京宏福苑' for column 'birthday' at row 1
#日期格式不对

#（2）第二种情况，给部分字段赋值
insert into 表名称 (部分字段列表) values(值列表);
#此时(值列表)中的值的数量、格式、顺序与(部分字段列表)对应即可

#例如：添加一条记录到teacher表，只给id和name字段赋值
insert into teacher (id,name) values (2,'李四'); 

mysql> select * from teacher;
+------+------+--------+------------+--------+-------------+
| id   | name | gender | birthday   | salary | tel         |
+------+------+--------+------------+--------+-------------+
|    1 | 张三 | m      | 1998-07-08 |  15000 | 18256953685 |
|    2 | 李四 | NULL   | NULL       |   NULL | NULL        | 
+------+------+--------+------------+--------+-------------+
2 rows in set (0.00 sec)
#没有赋值的字段都是默认值，此时默认值是NULL
#这种情况，当某个字段设置了“非空NOT NULL”约束，又没有提前指定“默认值”，
#那么在添加时没有赋值的话，会报错。明天演示非空约束。

#（3）一次添加多条记录
insert into 表名称  values(值列表1),(值列表2)...;
insert into 表名称 (部分字段列表) values(值列表),(值列表2)...;
#上面一个insert语句有几个(值列表)就表示添加几行记录。
#每一个值列表直接使用逗号分隔

#添加多条记录到teacher表
insert into teacher (id,name) values
 (3,'王五'),
 (4,'宋鑫'),
 (5,'赵志浩'),
 (6,'杨业行'),
 (7,'牛钰琪');
 
 #查看数据
 mysql> select * from teacher;
+------+--------+--------+------------+--------+-------------+
| id   | name   | gender | birthday   | salary | tel         |
+------+--------+--------+------------+--------+-------------+
|    1 | 张三   | m      | 1998-07-08 |  15000 | 18256953685 |
|    2 | 李四   | NULL   | NULL       |   NULL | NULL        |
|    3 | 王五   | NULL   | NULL       |   NULL | NULL        |
|    4 | 宋鑫   | NULL   | NULL       |   NULL | NULL        |
|    5 | 赵志浩 | NULL   | NULL       |   NULL | NULL        |
|    6 | 杨业行 | NULL   | NULL       |   NULL | NULL        |
|    7 | 牛钰琪 | NULL   | NULL       |   NULL | NULL        |
+------+--------+--------+------------+--------+-------------+
7 rows in set (0.00 sec)

```



## 5.2 修改语句

修改所有行

```sql
update 表名称 set 字段名 = 值, 字段名 = 值; #给所有行修改
```

```sql
#修改所有人的薪资，都涨了1000
update teacher set salary = salary + 1000 ; 
```

修改部分行

```sql
update 表名称 set 字段名 = 值, 字段名 = 值 where 条件; #给满足条件的行修改
```

```sql
#修改天琪的薪资降低5000
update teacher set salary = salary-5000 where tname = '天琪';
```



## 5.3 删除语句

删除部分行的数据

```sql
delete from 表名称 where 条件;
```

```sql
delete from teacher where tname = '天琪';
```

清空表，删除整张表的数据，但表结构留下

```sql
delete from 表名称;
```

```sql
delete from teacher;
```

截断表，删除整张表的数据，只留表结构

```sql
truncate 表名称;
```

```sql
truncate teacher;
```

truncate表和delete表的区别：

delete是一条一条删除记录的。如果在事务中，事务提交之前支持回滚。（后面会讲事务）

truncate是把整个表drop，新建一张，效率更高。就算在事务中，也无法回滚。

```sql
#同学问：是否可以删除salary字段的值，字段留着，值删掉
#可以实现，但是不是用delete，用update

#同学问：是否可以删除salary字段，连同字段和这个字段的数据都是删除
#可以实现，但是不是用delete，用alter table 表名称 drop column 字段名;

#同学问：只删除某个单元格的值
#可以实现，但是不是用delete，用update
```
