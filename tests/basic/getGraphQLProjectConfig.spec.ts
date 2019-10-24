import {getGraphQLProjectConfig} from '../../src';

test('resolves schema from file', async () => {
  const config = await getGraphQLProjectConfig(__dirname);
  const resolvedSchema = await config.resolveIntrospection();

  expect(resolvedSchema).toMatchSnapshot();
});
