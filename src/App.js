import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import Layout from './containers/Layout/Layout';
import MapLayout from './containers/Map/OpenlayerMaps/Map';
import HowToUse from './components/HowToUse';

class App extends Component {
  render() {
    return (
      <Layout>
        <Route path="/Maps" exact component={MapLayout} />
        <Route path="/HowToUse" exact component = {HowToUse} />
      </Layout>
    );
  }
}

export default App;