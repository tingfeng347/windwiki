---
description: 尚硅谷大模型技术之MySQL · 第3章 运算符。
---

# 第3章 运算符

MySQL支持很多运算符，常见的运算符：

## 3.1 算术运算符（掌握）

```sql
加：+
	在MySQL +就是求和，没有字符串拼接
减：-
乘：*
除：/   div（只保留整数部分）
	div：两个数相除只保留整数部分
	/：数学中的除
模：%   mod

mysql中没有 +=、++等运算符
```

```sql
#select 表达式
select 1+1;
update t_employee set salary = salary+100 where eid=27;

select 9/2, 9 div 2;

mysql> select 9/2, 9 div 2;
+--------+---------+
| 9/2    | 9 div 2 |
+--------+---------+
| 4.5000 |       4 |
+--------+---------+
1 row in set (0.00 sec)

select 9.5 / 1.5 , 9.5 div 1.5;

mysql> select 9.5 / 1.5 , 9.5 div 1.5;
+-----------+-------------+
| 9.5 / 1.5 | 9.5 div 1.5 |
+-----------+-------------+
|   6.33333 |           6 |
+-----------+-------------+
1 row in set (0.00 sec)

select 9 % 2, 9 mod 2;
select 9.5 % 1.5 , 9.5 mod 1.5;

select 'hello' + 'world';
mysql> select 'hello' + 'world';
+-------------------+
| 'hello' + 'world' |
+-------------------+
|                 0 |
+-------------------+
1 row in set, 2 warnings (0.00 sec)
```

## 3.2 比较运算符（掌握）

```sql
大于：>
小于：<
大于等于：>=
小于等于：>=
等于：=   不能用于null判断。MySQL没有==写法。
不等于：!=  或 <>  不能用于null判断
```

```sql
#查询薪资高于15000的员工姓名和薪资
select ename,salary from t_employee where salary>15000;

mysql> select ename,salary from t_employee where salary>15000;
+--------+--------+
| ename  | salary |
+--------+--------+
| 孙洪亮 |  28000 |
| 贾宝玉 |  15700 |
| 黄冰茹 |  15678 |
| 李冰冰 |  18760 |
| 谢吉娜 |  18978 |
| 舒淇格 |  16788 |
| 章嘉怡 |  15099 |
+--------+--------+
7 rows in set (0.00 sec)

#查询薪资正好是9000的员工姓名和薪资
select ename,salary from t_employee where salary = 9000;
select ename,salary from t_employee where salary == 9000;#错误，不支持==  #注意Java中判断用==，mysql判断用=

mysql> select ename,salary from t_employee where salary == 9000;
ERROR 1064 (42000): You have an error in your SQL syntax;
 check the manual that corresponds to your MySQL server version for the right syntax to use near '== 9000' at line 1
 
#查询籍贯native_place不是北京的
select * from t_employee where native_place != '北京';
select * from t_employee where native_place <> '北京';

#查询员工表中部门编号不是1
select * from t_employee where did != 1;
select * from t_employee where did <> 1;

#查询奖金比例是NULL
select * from t_employee where commission_pct = null; 

mysql> select * from t_employee where commission_pct = null; #无法用=null判断
Empty set (0.00 sec)
#mysql中只要有null值参与运算和比较，结果就是null，底层就是0，表示条件不成立。

#查询奖金比例是NULL
select * from t_employee where commission_pct <=> null; 
select * from t_employee where commission_pct is null; 

#查询“李冰冰”、“周旭飞”、“李易峰”这几个员工的信息
select * from t_employee where ename in ('李冰冰','周旭飞','李易峰');

#查询部门编号为2、3的员工信息
select * from t_employee where did in(2,3);

#查询部门编号不是2、3的员工信息
select * from t_employee where did not in(2,3);

#查询薪资在[10000,15000]之间
select * from t_employee where salary between 10000 and 15000;

#查询姓名中第二个字是'冰'的员工
select * from t_employee where ename like '冰'; #这么写等价于 ename='冰'
select * from t_employee where ename like '_冰%'; 
#这么写匹配的是第二个字是冰，后面可能没有第三个字，或者有好几个字

update t_employee set ename = '王冰' where ename = '李冰冰';

select * from t_employee where ename like '_冰_'; 
#这么写匹配的是第二个字是冰，后面有第三个字，且只有三个字

#查询员工的姓名、薪资、奖金比例、实发工资
#实发工资 = 薪资 + 薪资 * 奖金比例
select ename as 姓名,
salary as 薪资,
commission_pct as 奖金比例,
salary + salary * commission_pct as 实发工资
from t_employee;

#NULL在mysql中比较和计算都有特殊性，所有的计算遇到的null都是null。
#实发工资 = 薪资 + 薪资 * 奖金比例
select ename as 姓名,
salary as 薪资,
commission_pct as 奖金比例,
salary + salary * ifnull(commission_pct,0) as 实发工资
from t_employee;
```

## 3.3 区间或集合范围比较运算符（掌握）

```sql
区间范围：between x  and  y
	    not between x  and  y
集合范围：in (x,x,x)
	    not  in(x,x,x)
```

```sql
#查询薪资在[10000,15000]
select * from t_employee where salary>=10000 && salary<=15000;
select * from t_employee where salary between 10000 and 15000;

#查询籍贯在这几个地方的
select * from t_employee where native_place in ('北京', '浙江', '江西');

#查询薪资不在[10000,15000]
select * from t_employee where salary not between 10000 and 15000;

#查询籍贯不在这几个地方的
select * from t_employee where native_place not in ('北京', '浙江', '江西');
```

## 3.4 模糊匹配比较运算符（掌握）

%：代表任意个字符

_：代表一个字符，如果两个下划线代表两个字符

```sql
#查询名字中包含'冰'字
select * from t_employee where ename like '%冰%';

#查询名字以‘雷'结尾的
select * from t_employee where ename like '%雷';

#查询名字以’李'开头
select * from t_employee where ename like '李%';

#查询名字有冰这个字，但是冰的前面只能有1个字
select * from t_employee where ename like '_冰%';
```

```sql
#查询当前mysql数据库的字符集情况
show variables like '%character%';
```

## 3.5 逻辑运算符（掌握）

```sql
逻辑与：&& 或 and
逻辑或：|| 或 or
逻辑非：! 或 not
逻辑异或： xor
```

```sql
#查询薪资高于15000，并且性别是男的员工
select * from t_employee where salary>15000 and gender='男';
select * from t_employee where salary>15000 && gender='男';

select * from t_employee where salary>15000 & gender='男';#错误 &按位与
select * from t_employee where (salary>15000) & (gender='男');

#查询薪资高于15000，或者did为1的员工
select  * from t_employee where salary>15000 or did = 1;
select  * from t_employee where salary>15000 || did = 1;

#查询薪资不在[15000,20000]范围的
select  * from t_employee where salary not between 15000 and 20000;
select  * from t_employee where !(salary between 15000 and 20000);

#查询薪资高于15000，或者did为1的员工，两者只能满足其一
select  * from t_employee where salary>15000 xor did = 1;
select  * from t_employee where (salary>15000) ^ (did = 1);
```



## 3.6 关于null值的问题（掌握）

```sql
#（1）判断时
xx is null
xx is not null
xx <=> null

#(2)计算时
ifnull(xx,代替值)  当xx是null时，用代替值计算
```

```sql
#查询奖金比例为null的员工
select * from t_employee where commission_pct = null;  #失败
select * from t_employee where commission_pct = NULL; #失败
select * from t_employee where commission_pct = 'NULL'; #失败

select * from t_employee where commission_pct is null;   #成功
select * from t_employee where commission_pct <=> null;  #成功  <=>安全等于
```

```sql
#查询员工的实发工资，实发工资 = 薪资 + 薪资 * 奖金比例
select ename , salary + salary * commission_pct "实发工资" from t_employee; #失败，当commission_pct为null，结果都为null

select ename ,salary , commission_pct, salary + salary * ifnull(commission_pct,0) "实发工资" from t_employee;
```

## 3.7 位运算符

基本不用，这里就不展开讲解了。

```sql
左移：<<
右移：>>
按位与：&
按位或：|
按位异或：^
按位取反：~
```
