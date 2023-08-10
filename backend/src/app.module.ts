import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { MessagesModule } from './messages/messages.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { RoboticsModule } from './robotics/robotics.module';
import { RelayModule } from './relay/relay.module';

@Module({
  imports: [
    RelayModule,
    MessagesModule,
    RoboticsModule,
    ConfigModule.forRoot(),
    RedisModule.forRoot({
      config: {
        host: 'localhost',
        port: 6379,
      },
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      subscriptions: {
        'graphql-ws': {
          path: '/subscriptions',
        },
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
