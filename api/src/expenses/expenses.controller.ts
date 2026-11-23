import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createExpenseSchema } from './dto/create-expense.dto.js';
import type { CreateExpenseDto } from './dto/create-expense.dto.js';
import { expenseIdSchema } from './dto/expense-id.dto.js';
import { listExpensesSchema } from './dto/list-expenses.dto.js';
import type { ListExpensesDto } from './dto/list-expenses.dto.js';
import { updateExpenseSchema } from './dto/update-expense.dto.js';
import type { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpensesService } from './expenses.service.js';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query({ schema: listExpensesSchema }) query: ListExpensesDto,
  ) {
    return this.expenses.list(userId, query);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body({ schema: createExpenseSchema }) input: CreateExpenseDto,
  ) {
    return this.expenses.create(userId, input);
  }

  @Get(':id')
  get(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: expenseIdSchema }) id: string,
  ) {
    return this.expenses.get(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: expenseIdSchema }) id: string,
    @Body({ schema: updateExpenseSchema }) input: UpdateExpenseDto,
  ) {
    return this.expenses.update(userId, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', { schema: expenseIdSchema }) id: string,
  ) {
    return this.expenses.remove(userId, id);
  }
}
